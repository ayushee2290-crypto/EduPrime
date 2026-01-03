const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Student {
    // Create new student
    static async create(data) {
        const query = `
            INSERT INTO students (
                first_name, last_name, date_of_birth, gender, photo_url,
                email, phone, alternate_phone, address, city, state, pincode,
                school_name, board, current_class, target_exam, target_year,
                father_name, father_phone, father_email, father_occupation,
                mother_name, mother_phone, mother_email,
                status, referred_by, counselor_id, notes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
                $25, $26, $27, $28
            ) RETURNING *
        `;
        
        const values = [
            data.first_name, data.last_name, data.date_of_birth, data.gender, data.photo_url,
            data.email, data.phone, data.alternate_phone, data.address, data.city, data.state, data.pincode,
            data.school_name, data.board, data.current_class, data.target_exam, data.target_year,
            data.father_name, data.father_phone, data.father_email, data.father_occupation,
            data.mother_name, data.mother_phone, data.mother_email,
            data.status || 'inquiry', data.referred_by, data.counselor_id, data.notes
        ];
        
        return db.insert(query, values);
    }

    // Find by ID
    static async findById(id) {
        const query = `
            SELECT s.*, 
                   array_agg(DISTINCT b.name) as batch_names,
                   array_agg(DISTINCT b.id) as batch_ids
            FROM students s
            LEFT JOIN student_batches sb ON s.id = sb.student_id AND sb.status = 'active'
            LEFT JOIN batches b ON sb.batch_id = b.id
            WHERE s.id = $1
            GROUP BY s.id
        `;
        return db.getOne(query, [id]);
    }

    // Find by phone
    static async findByPhone(phone) {
        const query = 'SELECT * FROM students WHERE phone = $1';
        return db.getOne(query, [phone]);
    }

    // Find by enrollment number
    static async findByEnrollment(enrollmentNumber) {
        const query = 'SELECT * FROM students WHERE enrollment_number = $1';
        return db.getOne(query, [enrollmentNumber]);
    }

    // Get all students with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT s.*, 
                   array_agg(DISTINCT b.name) FILTER (WHERE b.name IS NOT NULL) as batch_names
            FROM students s
            LEFT JOIN student_batches sb ON s.id = sb.student_id AND sb.status = 'active'
            LEFT JOIN batches b ON sb.batch_id = b.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.status) {
            paramCount++;
            query += ` AND s.status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.target_exam) {
            paramCount++;
            query += ` AND s.target_exam = $${paramCount}`;
            values.push(filters.target_exam);
        }

        if (filters.batch_id) {
            paramCount++;
            query += ` AND sb.batch_id = $${paramCount}`;
            values.push(filters.batch_id);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND (s.first_name ILIKE $${paramCount} OR s.last_name ILIKE $${paramCount} 
                       OR s.phone ILIKE $${paramCount} OR s.enrollment_number ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
        }

        query += ' GROUP BY s.id ORDER BY s.created_at DESC';

        if (filters.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
        }

        if (filters.offset) {
            paramCount++;
            query += ` OFFSET $${paramCount}`;
            values.push(filters.offset);
        }

        return db.getMany(query, values);
    }

    // Update student
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;

        const allowedFields = [
            'first_name', 'last_name', 'date_of_birth', 'gender', 'photo_url',
            'email', 'phone', 'alternate_phone', 'address', 'city', 'state', 'pincode',
            'school_name', 'board', 'current_class', 'target_exam', 'target_year',
            'father_name', 'father_phone', 'father_email', 'father_occupation',
            'mother_name', 'mother_phone', 'mother_email',
            'status', 'notes'
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
            UPDATE students 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        return db.getOne(query, values);
    }

    // Enroll student (change status to enrolled)
    static async enroll(id, batchId) {
        return db.transaction(async (client) => {
            // Update student status
            await client.query(
                `UPDATE students SET status = 'enrolled', enrollment_date = CURRENT_DATE 
                 WHERE id = $1 AND status = 'inquiry'`,
                [id]
            );

            // Add to batch
            await client.query(
                `INSERT INTO student_batches (student_id, batch_id, status) 
                 VALUES ($1, $2, 'active') ON CONFLICT DO NOTHING`,
                [id, batchId]
            );

            // Return updated student
            const result = await client.query(
                'SELECT * FROM students WHERE id = $1',
                [id]
            );
            return result.rows[0];
        });
    }

    // Get student count by status
    static async getCountByStatus() {
        const query = `
            SELECT status, COUNT(*) as count
            FROM students
            GROUP BY status
        `;
        return db.getMany(query);
    }

    // Get students with low attendance
    static async getLowAttendance(threshold = 75) {
        const query = `
            SELECT * FROM vw_attendance_summary
            WHERE attendance_percentage < $1
            ORDER BY attendance_percentage ASC
        `;
        return db.getMany(query, [threshold]);
    }

    // Delete student (soft delete by changing status)
    static async delete(id) {
        const query = `
            UPDATE students SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 RETURNING *
        `;
        return db.getOne(query, [id]);
    }
}

module.exports = Student;
