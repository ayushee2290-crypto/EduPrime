const db = require('../config/database');

class Attendance {
    // Mark student attendance
    static async markStudent(data) {
        const query = `
            INSERT INTO student_attendance (
                student_id, batch_id, subject_id, faculty_id,
                attendance_date, status, check_in_time, check_out_time,
                marked_by, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (student_id, batch_id, subject_id, attendance_date)
            DO UPDATE SET 
                status = $6,
                check_in_time = COALESCE($7, student_attendance.check_in_time),
                check_out_time = COALESCE($8, student_attendance.check_out_time),
                marked_by = $9,
                remarks = COALESCE($10, student_attendance.remarks),
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const values = [
            data.student_id, data.batch_id, data.subject_id, data.faculty_id,
            data.attendance_date, data.status, data.check_in_time, data.check_out_time,
            data.marked_by, data.remarks
        ];
        
        return db.insert(query, values);
    }

    // Mark bulk attendance
    static async markBulk(attendanceList) {
        return db.transaction(async (client) => {
            const results = [];
            for (const attendance of attendanceList) {
                const result = await client.query(`
                    INSERT INTO student_attendance (
                        student_id, batch_id, subject_id, faculty_id,
                        attendance_date, status, marked_by
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (student_id, batch_id, subject_id, attendance_date)
                    DO UPDATE SET status = $6, marked_by = $7, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `, [
                    attendance.student_id, attendance.batch_id, attendance.subject_id, attendance.faculty_id,
                    attendance.attendance_date, attendance.status, attendance.marked_by
                ]);
                results.push(result.rows[0]);
            }
            return results;
        });
    }

    // Mark faculty attendance
    static async markFaculty(data) {
        const query = `
            INSERT INTO faculty_attendance (
                faculty_id, attendance_date, status,
                check_in_time, check_out_time,
                classes_scheduled, classes_conducted,
                marked_by, remarks
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (faculty_id, attendance_date)
            DO UPDATE SET 
                status = $3,
                check_in_time = COALESCE($4, faculty_attendance.check_in_time),
                check_out_time = COALESCE($5, faculty_attendance.check_out_time),
                classes_scheduled = COALESCE($6, faculty_attendance.classes_scheduled),
                classes_conducted = COALESCE($7, faculty_attendance.classes_conducted),
                remarks = COALESCE($9, faculty_attendance.remarks)
            RETURNING *
        `;
        
        const values = [
            data.faculty_id, data.attendance_date, data.status,
            data.check_in_time, data.check_out_time,
            data.classes_scheduled, data.classes_conducted,
            data.marked_by, data.remarks
        ];
        
        return db.insert(query, values);
    }

    // Get student attendance for a date
    static async getStudentAttendance(filters) {
        let query = `
            SELECT sa.*, 
                   s.first_name || ' ' || s.last_name as student_name,
                   s.enrollment_number,
                   b.name as batch_name,
                   sub.name as subject_name
            FROM student_attendance sa
            JOIN students s ON sa.student_id = s.id
            LEFT JOIN batches b ON sa.batch_id = b.id
            LEFT JOIN subjects sub ON sa.subject_id = sub.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.date) {
            paramCount++;
            query += ` AND sa.attendance_date = $${paramCount}`;
            values.push(filters.date);
        }

        if (filters.batch_id) {
            paramCount++;
            query += ` AND sa.batch_id = $${paramCount}`;
            values.push(filters.batch_id);
        }

        if (filters.student_id) {
            paramCount++;
            query += ` AND sa.student_id = $${paramCount}`;
            values.push(filters.student_id);
        }

        if (filters.status) {
            paramCount++;
            query += ` AND sa.status = $${paramCount}`;
            values.push(filters.status);
        }

        query += ' ORDER BY s.first_name ASC';
        return db.getMany(query, values);
    }

    // Get student attendance summary
    static async getStudentSummary(studentId, startDate, endDate) {
        const query = `
            SELECT 
                sa.student_id,
                b.name as batch_name,
                COUNT(*) as total_classes,
                SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN sa.status = 'late' THEN 1 ELSE 0 END) as late,
                SUM(CASE WHEN sa.status = 'leave' THEN 1 ELSE 0 END) as leave,
                ROUND(
                    (SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END)::DECIMAL / 
                    NULLIF(COUNT(*), 0)) * 100, 2
                ) as percentage
            FROM student_attendance sa
            JOIN batches b ON sa.batch_id = b.id
            WHERE sa.student_id = $1
            AND sa.attendance_date BETWEEN $2 AND $3
            GROUP BY sa.student_id, b.name
        `;
        return db.getMany(query, [studentId, startDate, endDate]);
    }

    // Get batch attendance summary
    static async getBatchSummary(batchId, date) {
        const query = `
            SELECT 
                COUNT(DISTINCT sb.student_id) as total_students,
                COUNT(DISTINCT CASE WHEN sa.status = 'present' THEN sa.student_id END) as present,
                COUNT(DISTINCT CASE WHEN sa.status = 'absent' THEN sa.student_id END) as absent,
                COUNT(DISTINCT CASE WHEN sa.status = 'late' THEN sa.student_id END) as late,
                COUNT(DISTINCT CASE WHEN sa.status IS NULL THEN sb.student_id END) as not_marked
            FROM student_batches sb
            LEFT JOIN student_attendance sa ON sb.student_id = sa.student_id 
                AND sa.batch_id = sb.batch_id 
                AND sa.attendance_date = $2
            WHERE sb.batch_id = $1 AND sb.status = 'active'
        `;
        return db.getOne(query, [batchId, date]);
    }

    // Get students with low attendance
    static async getLowAttendance(threshold = 75, batchId = null) {
        let query = `
            SELECT * FROM vw_attendance_summary
            WHERE attendance_percentage < $1
        `;
        const values = [threshold];
        
        if (batchId) {
            query += ' AND batch_name = (SELECT name FROM batches WHERE id = $2)';
            values.push(batchId);
        }
        
        query += ' ORDER BY attendance_percentage ASC';
        return db.getMany(query, values);
    }

    // Get today's absentees
    static async getTodayAbsentees(batchId = null) {
        let query = `
            SELECT sa.*, 
                   s.first_name || ' ' || s.last_name as student_name,
                   s.phone as student_phone,
                   s.father_name, s.father_phone,
                   b.name as batch_name
            FROM student_attendance sa
            JOIN students s ON sa.student_id = s.id
            JOIN batches b ON sa.batch_id = b.id
            WHERE sa.attendance_date = CURRENT_DATE
            AND sa.status = 'absent'
        `;
        const values = [];

        if (batchId) {
            query += ' AND sa.batch_id = $1';
            values.push(batchId);
        }

        query += ' ORDER BY b.name, s.first_name';
        return db.getMany(query, values);
    }

    // Get consecutive absences
    static async getConsecutiveAbsences(days = 3) {
        const query = `
            WITH absence_streaks AS (
                SELECT 
                    student_id,
                    batch_id,
                    attendance_date,
                    status,
                    attendance_date - ROW_NUMBER() OVER (
                        PARTITION BY student_id, batch_id 
                        ORDER BY attendance_date
                    )::INTEGER as streak_group
                FROM student_attendance
                WHERE status = 'absent'
                AND attendance_date >= CURRENT_DATE - INTERVAL '30 days'
            ),
            streak_counts AS (
                SELECT 
                    student_id,
                    batch_id,
                    streak_group,
                    COUNT(*) as consecutive_days,
                    MAX(attendance_date) as last_absent_date
                FROM absence_streaks
                GROUP BY student_id, batch_id, streak_group
                HAVING COUNT(*) >= $1
            )
            SELECT 
                sc.*,
                s.first_name || ' ' || s.last_name as student_name,
                s.phone as student_phone,
                s.father_name, s.father_phone,
                b.name as batch_name
            FROM streak_counts sc
            JOIN students s ON sc.student_id = s.id
            JOIN batches b ON sc.batch_id = b.id
            ORDER BY sc.consecutive_days DESC
        `;
        return db.getMany(query, [days]);
    }

    // Get faculty attendance summary
    static async getFacultyAttendance(facultyId, startDate, endDate) {
        const query = `
            SELECT 
                fa.*,
                f.first_name || ' ' || f.last_name as faculty_name
            FROM faculty_attendance fa
            JOIN faculty f ON fa.faculty_id = f.id
            WHERE fa.faculty_id = $1
            AND fa.attendance_date BETWEEN $2 AND $3
            ORDER BY fa.attendance_date DESC
        `;
        return db.getMany(query, [facultyId, startDate, endDate]);
    }

    // Get attendance report for date range
    static async getAttendanceReport(startDate, endDate, batchId = null) {
        let query = `
            SELECT 
                sa.attendance_date,
                b.name as batch_name,
                COUNT(*) as total_marked,
                SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) as absent,
                ROUND(
                    (SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END)::DECIMAL / 
                    NULLIF(COUNT(*), 0)) * 100, 2
                ) as percentage
            FROM student_attendance sa
            JOIN batches b ON sa.batch_id = b.id
            WHERE sa.attendance_date BETWEEN $1 AND $2
        `;
        const values = [startDate, endDate];

        if (batchId) {
            query += ' AND sa.batch_id = $3';
            values.push(batchId);
        }

        query += ' GROUP BY sa.attendance_date, b.name ORDER BY sa.attendance_date DESC, b.name';
        return db.getMany(query, values);
    }
}

module.exports = Attendance;
