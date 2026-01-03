const db = require('../config/database');

class Faculty {
    // Create new faculty
    static async create(data) {
        const query = `
            INSERT INTO faculty (
                first_name, last_name, email, phone, alternate_phone, photo_url,
                employee_id, designation, department, specialization, qualification, experience_years,
                subject_ids, joining_date, employment_type, salary,
                available_days, available_from, available_to,
                address, city, is_active
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
            ) RETURNING *
        `;
        
        const values = [
            data.first_name, data.last_name, data.email, data.phone, data.alternate_phone, data.photo_url,
            data.employee_id, data.designation, data.department, data.specialization, data.qualification, data.experience_years,
            data.subject_ids, data.joining_date, data.employment_type, data.salary,
            data.available_days, data.available_from, data.available_to,
            data.address, data.city, data.is_active !== false
        ];
        
        return db.insert(query, values);
    }

    // Find by ID
    static async findById(id) {
        const query = `
            SELECT f.*, 
                   array_agg(DISTINCT jsonb_build_object('batch_id', b.id, 'batch_name', b.name, 'subject', s.name)) 
                   FILTER (WHERE b.id IS NOT NULL) as assigned_batches
            FROM faculty f
            LEFT JOIN faculty_batches fb ON f.id = fb.faculty_id
            LEFT JOIN batches b ON fb.batch_id = b.id AND b.is_active = true
            LEFT JOIN subjects s ON fb.subject_id = s.id
            WHERE f.id = $1
            GROUP BY f.id
        `;
        return db.getOne(query, [id]);
    }

    // Find by email
    static async findByEmail(email) {
        const query = 'SELECT * FROM faculty WHERE email = $1';
        return db.getOne(query, [email]);
    }

    // Get all faculty with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT f.*, 
                   array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as subject_names,
                   COUNT(DISTINCT fb.batch_id) as batch_count
            FROM faculty f
            LEFT JOIN subjects s ON s.id = ANY(f.subject_ids)
            LEFT JOIN faculty_batches fb ON f.id = fb.faculty_id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.is_active !== undefined) {
            paramCount++;
            query += ` AND f.is_active = $${paramCount}`;
            values.push(filters.is_active);
        }

        if (filters.subject_id) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(f.subject_ids)`;
            values.push(filters.subject_id);
        }

        if (filters.department) {
            paramCount++;
            query += ` AND f.department = $${paramCount}`;
            values.push(filters.department);
        }

        if (filters.search) {
            paramCount++;
            query += ` AND (f.first_name ILIKE $${paramCount} OR f.last_name ILIKE $${paramCount} 
                       OR f.email ILIKE $${paramCount} OR f.employee_id ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
        }

        query += ' GROUP BY f.id ORDER BY f.first_name ASC';

        return db.getMany(query, values);
    }

    // Update faculty
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;

        const allowedFields = [
            'first_name', 'last_name', 'email', 'phone', 'alternate_phone', 'photo_url',
            'designation', 'department', 'specialization', 'qualification', 'experience_years',
            'subject_ids', 'employment_type', 'salary',
            'available_days', 'available_from', 'available_to',
            'address', 'city', 'is_active'
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
            UPDATE faculty 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        return db.getOne(query, values);
    }

    // Assign faculty to batch
    static async assignToBatch(facultyId, batchId, subjectId, isPrimary = true) {
        const query = `
            INSERT INTO faculty_batches (faculty_id, batch_id, subject_id, is_primary)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (faculty_id, batch_id, subject_id) 
            DO UPDATE SET is_primary = $4
            RETURNING *
        `;
        return db.insert(query, [facultyId, batchId, subjectId, isPrimary]);
    }

    // Remove faculty from batch
    static async removeFromBatch(facultyId, batchId) {
        const query = `
            DELETE FROM faculty_batches 
            WHERE faculty_id = $1 AND batch_id = $2
        `;
        return db.remove(query, [facultyId, batchId]);
    }

    // Get faculty schedule
    static async getSchedule(facultyId, date = null) {
        let query = `
            SELECT t.*, b.name as batch_name, s.name as subject_name
            FROM timetable t
            JOIN batches b ON t.batch_id = b.id
            JOIN subjects s ON t.subject_id = s.id
            WHERE t.faculty_id = $1 AND t.is_active = true
        `;
        const values = [facultyId];

        if (date) {
            query += ` AND t.day_of_week = EXTRACT(DOW FROM $2::date)`;
            values.push(date);
        }

        query += ' ORDER BY t.day_of_week, t.start_time';
        return db.getMany(query, values);
    }

    // Get faculty workload summary
    static async getWorkloadSummary(facultyId) {
        const query = `
            SELECT 
                f.id,
                f.first_name || ' ' || f.last_name as faculty_name,
                COUNT(DISTINCT fb.batch_id) as total_batches,
                COUNT(DISTINCT t.id) as weekly_classes,
                SUM(EXTRACT(EPOCH FROM (t.end_time - t.start_time))/3600) as weekly_hours
            FROM faculty f
            LEFT JOIN faculty_batches fb ON f.id = fb.faculty_id
            LEFT JOIN timetable t ON f.id = t.faculty_id AND t.is_active = true
            WHERE f.id = $1
            GROUP BY f.id, f.first_name, f.last_name
        `;
        return db.getOne(query, [facultyId]);
    }

    // Get available faculty for substitution
    static async getAvailableForSubstitution(dayOfWeek, startTime, endTime, subjectId) {
        const query = `
            SELECT f.*
            FROM faculty f
            WHERE f.is_active = true
            AND $4 = ANY(f.subject_ids)
            AND $1::text = ANY(f.available_days)
            AND f.available_from <= $2::time
            AND f.available_to >= $3::time
            AND f.id NOT IN (
                SELECT faculty_id FROM timetable 
                WHERE day_of_week = $1 
                AND is_active = true
                AND (
                    (start_time <= $2::time AND end_time > $2::time)
                    OR (start_time < $3::time AND end_time >= $3::time)
                    OR (start_time >= $2::time AND end_time <= $3::time)
                )
            )
        `;
        return db.getMany(query, [dayOfWeek, startTime, endTime, subjectId]);
    }

    // Delete faculty (soft delete)
    static async delete(id) {
        const query = `
            UPDATE faculty SET is_active = false, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 RETURNING *
        `;
        return db.getOne(query, [id]);
    }
}

module.exports = Faculty;
