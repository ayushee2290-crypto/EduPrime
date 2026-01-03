const db = require('../config/database');

class Inquiry {
    // Create new inquiry
    static async create(data) {
        const query = `
            INSERT INTO inquiries (
                student_name, phone, alternate_phone, email,
                parent_name, parent_phone,
                current_class, target_course, target_year,
                source, referred_by, assigned_counselor_id, notes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            ) RETURNING *
        `;
        
        const values = [
            data.student_name, data.phone, data.alternate_phone, data.email,
            data.parent_name, data.parent_phone,
            data.current_class, data.target_course, data.target_year,
            data.source || 'website', data.referred_by, data.assigned_counselor_id, data.notes
        ];
        
        return db.insert(query, values);
    }

    // Find by ID
    static async findById(id) {
        const query = `
            SELECT i.*, u.email as counselor_email
            FROM inquiries i
            LEFT JOIN users u ON i.assigned_counselor_id = u.id
            WHERE i.id = $1
        `;
        return db.getOne(query, [id]);
    }

    // Find by phone
    static async findByPhone(phone) {
        const query = 'SELECT * FROM inquiries WHERE phone = $1 ORDER BY created_at DESC';
        return db.getMany(query, [phone]);
    }

    // Get all inquiries with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT i.*, u.email as counselor_email
            FROM inquiries i
            LEFT JOIN users u ON i.assigned_counselor_id = u.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.status) {
            paramCount++;
            query += ` AND i.status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.target_course) {
            paramCount++;
            query += ` AND i.target_course = $${paramCount}`;
            values.push(filters.target_course);
        }

        if (filters.source) {
            paramCount++;
            query += ` AND i.source = $${paramCount}`;
            values.push(filters.source);
        }

        if (filters.counselor_id) {
            paramCount++;
            query += ` AND i.assigned_counselor_id = $${paramCount}`;
            values.push(filters.counselor_id);
        }

        if (filters.follow_up_due) {
            query += ` AND i.next_follow_up_date <= CURRENT_DATE AND i.status NOT IN ('converted', 'lost')`;
        }

        if (filters.search) {
            paramCount++;
            query += ` AND (i.student_name ILIKE $${paramCount} OR i.phone ILIKE $${paramCount} OR i.email ILIKE $${paramCount})`;
            values.push(`%${filters.search}%`);
        }

        if (filters.start_date && filters.end_date) {
            paramCount++;
            query += ` AND i.created_at BETWEEN $${paramCount}`;
            values.push(filters.start_date);
            paramCount++;
            query += ` AND $${paramCount}`;
            values.push(filters.end_date);
        }

        query += ' ORDER BY i.created_at DESC';

        if (filters.limit) {
            paramCount++;
            query += ` LIMIT $${paramCount}`;
            values.push(filters.limit);
        }

        return db.getMany(query, values);
    }

    // Update inquiry
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;

        const allowedFields = [
            'student_name', 'phone', 'alternate_phone', 'email',
            'parent_name', 'parent_phone',
            'current_class', 'target_course', 'target_year',
            'source', 'referred_by', 'status', 'assigned_counselor_id',
            'next_follow_up_date', 'lost_reason', 'notes'
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
            UPDATE inquiries 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        return db.getOne(query, values);
    }

    // Add interaction/follow-up
    static async addInteraction(id, interaction) {
        const query = `
            UPDATE inquiries
            SET 
                interaction_history = COALESCE(interaction_history, '[]'::jsonb) || $2::jsonb,
                last_contact_date = CURRENT_TIMESTAMP,
                follow_up_count = follow_up_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        
        const interactionData = JSON.stringify({
            date: new Date().toISOString(),
            type: interaction.type, // call, email, whatsapp, visit
            notes: interaction.notes,
            outcome: interaction.outcome,
            next_action: interaction.next_action,
            done_by: interaction.done_by
        });
        
        return db.getOne(query, [id, interactionData]);
    }

    // Convert to student
    static async convert(id, studentId) {
        const query = `
            UPDATE inquiries
            SET 
                status = 'converted',
                converted_student_id = $2,
                conversion_date = CURRENT_DATE,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        return db.getOne(query, [id, studentId]);
    }

    // Mark as lost
    static async markLost(id, reason) {
        const query = `
            UPDATE inquiries
            SET 
                status = 'lost',
                lost_reason = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        return db.getOne(query, [id, reason]);
    }

    // Get follow-up due today
    static async getFollowUpsDue() {
        const query = `
            SELECT i.*, u.email as counselor_email
            FROM inquiries i
            LEFT JOIN users u ON i.assigned_counselor_id = u.id
            WHERE i.next_follow_up_date <= CURRENT_DATE
            AND i.status NOT IN ('converted', 'lost')
            ORDER BY i.next_follow_up_date ASC
        `;
        return db.getMany(query);
    }

    // Get conversion analytics
    static async getConversionAnalytics(startDate, endDate) {
        const query = `
            SELECT 
                COUNT(*) as total_inquiries,
                COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost,
                COUNT(CASE WHEN status NOT IN ('converted', 'lost') THEN 1 END) as pending,
                ROUND(
                    COUNT(CASE WHEN status = 'converted' THEN 1 END)::DECIMAL / 
                    NULLIF(COUNT(*), 0) * 100, 2
                ) as conversion_rate,
                source,
                target_course
            FROM inquiries
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY source, target_course
            ORDER BY total_inquiries DESC
        `;
        return db.getMany(query, [startDate, endDate]);
    }

    // Get source-wise analytics
    static async getSourceAnalytics(startDate, endDate) {
        const query = `
            SELECT 
                source,
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
                ROUND(
                    COUNT(CASE WHEN status = 'converted' THEN 1 END)::DECIMAL / 
                    NULLIF(COUNT(*), 0) * 100, 2
                ) as conversion_rate
            FROM inquiries
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY source
            ORDER BY total DESC
        `;
        return db.getMany(query, [startDate, endDate]);
    }

    // Delete inquiry
    static async delete(id) {
        const query = 'DELETE FROM inquiries WHERE id = $1 RETURNING *';
        return db.getOne(query, [id]);
    }
}

module.exports = Inquiry;
