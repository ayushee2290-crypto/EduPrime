const db = require('../config/database');

class Batch {
    // Create new batch
    static async create(data) {
        const query = `
            INSERT INTO batches (
                name, code, course_id, batch_type,
                start_date, end_date, class_days, start_time, end_time,
                max_students, batch_fee, academic_year, is_active
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            ) RETURNING *
        `;
        
        const values = [
            data.name, data.code, data.course_id, data.batch_type || 'regular',
            data.start_date, data.end_date, data.class_days, data.start_time, data.end_time,
            data.max_students || 50, data.batch_fee, data.academic_year, data.is_active !== false
        ];
        
        return db.insert(query, values);
    }

    // Find by ID
    static async findById(id) {
        const query = `
            SELECT b.*, c.name as course_name, c.course_type,
                   COUNT(DISTINCT sb.student_id) as enrolled_students,
                   array_agg(DISTINCT jsonb_build_object(
                       'faculty_id', f.id, 
                       'faculty_name', f.first_name || ' ' || f.last_name,
                       'subject', s.name
                   )) FILTER (WHERE f.id IS NOT NULL) as faculty_list
            FROM batches b
            LEFT JOIN courses c ON b.course_id = c.id
            LEFT JOIN student_batches sb ON b.id = sb.batch_id AND sb.status = 'active'
            LEFT JOIN faculty_batches fb ON b.id = fb.batch_id
            LEFT JOIN faculty f ON fb.faculty_id = f.id
            LEFT JOIN subjects s ON fb.subject_id = s.id
            WHERE b.id = $1
            GROUP BY b.id, c.name, c.course_type
        `;
        return db.getOne(query, [id]);
    }

    // Find by code
    static async findByCode(code) {
        const query = 'SELECT * FROM batches WHERE code = $1';
        return db.getOne(query, [code]);
    }

    // Get all batches with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT b.*, c.name as course_name, c.course_type,
                   COUNT(DISTINCT sb.student_id) as enrolled_students
            FROM batches b
            LEFT JOIN courses c ON b.course_id = c.id
            LEFT JOIN student_batches sb ON b.id = sb.batch_id AND sb.status = 'active'
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.is_active !== undefined) {
            paramCount++;
            query += ` AND b.is_active = $${paramCount}`;
            values.push(filters.is_active);
        }

        if (filters.course_id) {
            paramCount++;
            query += ` AND b.course_id = $${paramCount}`;
            values.push(filters.course_id);
        }

        if (filters.batch_type) {
            paramCount++;
            query += ` AND b.batch_type = $${paramCount}`;
            values.push(filters.batch_type);
        }

        if (filters.academic_year) {
            paramCount++;
            query += ` AND b.academic_year = $${paramCount}`;
            values.push(filters.academic_year);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND (b.name ILIKE $${paramCount} OR b.code ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
        }

        query += ' GROUP BY b.id, c.name, c.course_type ORDER BY b.start_date DESC';

        return db.getMany(query, values);
    }

    // Update batch
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;

        const allowedFields = [
            'name', 'code', 'course_id', 'batch_type',
            'start_date', 'end_date', 'class_days', 'start_time', 'end_time',
            'max_students', 'batch_fee', 'academic_year', 'is_active'
        ];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                paramCount++;
                fields.push(`${field} = $${paramCount}`);
                values.push(data[field]);
            }
        }

        if (fields.length === 0) return null;

        paramCount++;
        values.push(id);

        const query = `
            UPDATE batches 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        return db.getOne(query, values);
    }

    // Get students in batch
    static async getStudents(batchId) {
        const query = `
            SELECT s.*, sb.roll_number, sb.enrollment_date as batch_enrollment_date
            FROM students s
            JOIN student_batches sb ON s.id = sb.student_id
            WHERE sb.batch_id = $1 AND sb.status = 'active'
            ORDER BY sb.roll_number, s.first_name
        `;
        return db.getMany(query, [batchId]);
    }

    // Add student to batch
    static async addStudent(batchId, studentId, rollNumber = null) {
        const query = `
            INSERT INTO student_batches (student_id, batch_id, roll_number, status)
            VALUES ($1, $2, $3, 'active')
            ON CONFLICT (student_id, batch_id) DO UPDATE SET status = 'active', roll_number = $3
            RETURNING *
        `;
        return db.insert(query, [studentId, batchId, rollNumber]);
    }

    // Remove student from batch
    static async removeStudent(batchId, studentId) {
        const query = `
            UPDATE student_batches SET status = 'dropped'
            WHERE batch_id = $1 AND student_id = $2
            RETURNING *
        `;
        return db.getOne(query, [batchId, studentId]);
    }

    // Get batch timetable
    static async getTimetable(batchId) {
        const query = `
            SELECT t.*, f.first_name || ' ' || f.last_name as faculty_name, s.name as subject_name
            FROM timetable t
            JOIN faculty f ON t.faculty_id = f.id
            JOIN subjects s ON t.subject_id = s.id
            WHERE t.batch_id = $1 AND t.is_active = true
            ORDER BY t.day_of_week, t.start_time
        `;
        return db.getMany(query, [batchId]);
    }

    // Get batch performance summary
    static async getPerformance(batchId) {
        const query = `
            SELECT * FROM vw_batch_performance
            WHERE batch_id = $1
            ORDER BY exam_date DESC
        `;
        return db.getMany(query, [batchId]);
    }

    // Get syllabus progress
    static async getSyllabusProgress(batchId) {
        const query = `
            SELECT 
                st.chapter_name,
                st.topic_name,
                s.name as subject_name,
                sp.status,
                sp.completion_date,
                sp.hours_spent,
                f.first_name || ' ' || f.last_name as faculty_name
            FROM syllabus_topics st
            LEFT JOIN syllabus_progress sp ON st.id = sp.topic_id AND sp.batch_id = $1
            LEFT JOIN subjects s ON st.subject_id = s.id
            LEFT JOIN faculty f ON sp.faculty_id = f.id
            WHERE st.course_type = (SELECT c.course_type FROM batches b JOIN courses c ON b.course_id = c.id WHERE b.id = $1)
            ORDER BY st.sequence_order
        `;
        return db.getMany(query, [batchId]);
    }

    // Delete batch (soft delete)
    static async delete(id) {
        const query = `
            UPDATE batches SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 RETURNING *
        `;
        return db.getOne(query, [id]);
    }
}

module.exports = Batch;
