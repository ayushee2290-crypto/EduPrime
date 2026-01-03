const db = require('../config/database');

class Exam {
    // Create new exam
    static async create(data) {
        const query = `
            INSERT INTO exams (
                name, code, exam_type, batch_ids, subject_id, course_type,
                exam_date, start_time, duration_minutes,
                total_marks, passing_marks, negative_marking, negative_marks_value,
                syllabus_topics, instructions, created_by
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            ) RETURNING *
        `;
        
        const values = [
            data.name, data.code, data.exam_type, data.batch_ids, data.subject_id, data.course_type,
            data.exam_date, data.start_time, data.duration_minutes,
            data.total_marks, data.passing_marks, data.negative_marking || false, data.negative_marks_value,
            data.syllabus_topics, data.instructions, data.created_by
        ];
        
        return db.insert(query, values);
    }

    // Find by ID
    static async findById(id) {
        const query = `
            SELECT e.*, s.name as subject_name,
                   COUNT(DISTINCT r.student_id) as students_appeared,
                   AVG(r.percentage) as average_percentage
            FROM exams e
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN results r ON e.id = r.exam_id
            WHERE e.id = $1
            GROUP BY e.id, s.name
        `;
        return db.getOne(query, [id]);
    }

    // Get all exams with filters
    static async findAll(filters = {}) {
        let query = `
            SELECT e.*, s.name as subject_name,
                   COUNT(DISTINCT r.student_id) as students_appeared
            FROM exams e
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN results r ON e.id = r.exam_id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.exam_type) {
            paramCount++;
            query += ` AND e.exam_type = $${paramCount}`;
            values.push(filters.exam_type);
        }

        if (filters.batch_id) {
            paramCount++;
            query += ` AND $${paramCount} = ANY(e.batch_ids)`;
            values.push(filters.batch_id);
        }

        if (filters.subject_id) {
            paramCount++;
            query += ` AND e.subject_id = $${paramCount}`;
            values.push(filters.subject_id);
        }

        if (filters.course_type) {
            paramCount++;
            query += ` AND e.course_type = $${paramCount}`;
            values.push(filters.course_type);
        }

        if (filters.start_date && filters.end_date) {
            paramCount++;
            query += ` AND e.exam_date BETWEEN $${paramCount}`;
            values.push(filters.start_date);
            paramCount++;
            query += ` AND $${paramCount}`;
            values.push(filters.end_date);
        }

        if (filters.status) {
            paramCount++;
            query += ` AND e.status = $${paramCount}`;
            values.push(filters.status);
        }

        query += ' GROUP BY e.id, s.name ORDER BY e.exam_date DESC';

        return db.getMany(query, values);
    }

    // Update exam
    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramCount = 0;

        const allowedFields = [
            'name', 'exam_type', 'batch_ids', 'subject_id',
            'exam_date', 'start_time', 'duration_minutes',
            'total_marks', 'passing_marks', 'negative_marking', 'negative_marks_value',
            'syllabus_topics', 'instructions', 'status'
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
            UPDATE exams 
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        return db.getOne(query, values);
    }

    // Upload result
    static async uploadResult(data) {
        const query = `
            INSERT INTO results (
                exam_id, student_id, marks_obtained, total_marks, percentage,
                question_analysis, topic_analysis, is_absent, remarks, evaluated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (exam_id, student_id)
            DO UPDATE SET
                marks_obtained = $3,
                percentage = $5,
                question_analysis = COALESCE($6, results.question_analysis),
                topic_analysis = COALESCE($7, results.topic_analysis),
                is_absent = $8,
                remarks = $9,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const percentage = (data.marks_obtained / data.total_marks) * 100;
        
        const values = [
            data.exam_id, data.student_id, data.marks_obtained, data.total_marks, percentage,
            data.question_analysis, data.topic_analysis, data.is_absent || false, 
            data.remarks, data.evaluated_by
        ];
        
        return db.insert(query, values);
    }

    // Upload bulk results
    static async uploadBulkResults(examId, results) {
        return db.transaction(async (client) => {
            const exam = await client.query('SELECT total_marks FROM exams WHERE id = $1', [examId]);
            const totalMarks = exam.rows[0].total_marks;

            const uploadedResults = [];
            for (const result of results) {
                const percentage = (result.marks_obtained / totalMarks) * 100;
                const res = await client.query(`
                    INSERT INTO results (exam_id, student_id, marks_obtained, total_marks, percentage, is_absent)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (exam_id, student_id)
                    DO UPDATE SET marks_obtained = $3, percentage = $5, is_absent = $6, updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                `, [examId, result.student_id, result.marks_obtained, totalMarks, percentage, result.is_absent || false]);
                uploadedResults.push(res.rows[0]);
            }

            // Update ranks
            await client.query(`
                WITH ranked AS (
                    SELECT id, ROW_NUMBER() OVER (ORDER BY marks_obtained DESC) as rank
                    FROM results
                    WHERE exam_id = $1 AND is_absent = false
                )
                UPDATE results r
                SET rank_overall = ranked.rank
                FROM ranked
                WHERE r.id = ranked.id
            `, [examId]);

            return uploadedResults;
        });
    }

    // Get results for an exam
    static async getResults(examId) {
        const query = `
            SELECT r.*, 
                   s.first_name || ' ' || s.last_name as student_name,
                   s.enrollment_number,
                   sb.batch_id,
                   b.name as batch_name
            FROM results r
            JOIN students s ON r.student_id = s.id
            LEFT JOIN student_batches sb ON s.id = sb.student_id AND sb.status = 'active'
            LEFT JOIN batches b ON sb.batch_id = b.id
            WHERE r.exam_id = $1
            ORDER BY r.rank_overall NULLS LAST, r.marks_obtained DESC
        `;
        return db.getMany(query, [examId]);
    }

    // Get student results
    static async getStudentResults(studentId, limit = 10) {
        const query = `
            SELECT r.*, e.name as exam_name, e.exam_type, e.exam_date,
                   s.name as subject_name
            FROM results r
            JOIN exams e ON r.exam_id = e.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE r.student_id = $1
            ORDER BY e.exam_date DESC
            LIMIT $2
        `;
        return db.getMany(query, [studentId, limit]);
    }

    // Get performance analytics
    static async getPerformanceAnalytics(examId) {
        const query = `
            SELECT 
                COUNT(*) as total_students,
                COUNT(CASE WHEN is_absent = false THEN 1 END) as appeared,
                COUNT(CASE WHEN is_absent = true THEN 1 END) as absent,
                ROUND(AVG(CASE WHEN is_absent = false THEN percentage END), 2) as average_percentage,
                ROUND(MAX(percentage), 2) as highest_percentage,
                ROUND(MIN(CASE WHEN is_absent = false THEN percentage END), 2) as lowest_percentage,
                COUNT(CASE WHEN percentage >= 90 THEN 1 END) as above_90,
                COUNT(CASE WHEN percentage >= 75 AND percentage < 90 THEN 1 END) as between_75_90,
                COUNT(CASE WHEN percentage >= 50 AND percentage < 75 THEN 1 END) as between_50_75,
                COUNT(CASE WHEN percentage >= 33 AND percentage < 50 THEN 1 END) as between_33_50,
                COUNT(CASE WHEN percentage < 33 AND is_absent = false THEN 1 END) as below_33
            FROM results
            WHERE exam_id = $1
        `;
        return db.getOne(query, [examId]);
    }

    // Get topic-wise analysis
    static async getTopicAnalysis(examId) {
        const query = `
            SELECT 
                topic_key,
                COUNT(*) as student_count,
                ROUND(AVG((topic_data->>'scored')::numeric), 2) as avg_scored,
                ROUND(AVG((topic_data->>'total')::numeric), 2) as avg_total,
                ROUND(AVG((topic_data->>'scored')::numeric / NULLIF((topic_data->>'total')::numeric, 0) * 100), 2) as avg_percentage
            FROM results,
                 jsonb_each(topic_analysis) as topics(topic_key, topic_data)
            WHERE exam_id = $1 AND topic_analysis IS NOT NULL
            GROUP BY topic_key
            ORDER BY avg_percentage ASC
        `;
        return db.getMany(query, [examId]);
    }

    // Publish results
    static async publishResults(examId) {
        const query = `
            UPDATE exams
            SET results_published = true, 
                results_published_at = CURRENT_TIMESTAMP,
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        return db.getOne(query, [examId]);
    }

    // Get upcoming exams
    static async getUpcoming(batchId = null, days = 30) {
        let query = `
            SELECT e.*, s.name as subject_name
            FROM exams e
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE e.exam_date >= CURRENT_DATE
            AND e.exam_date <= CURRENT_DATE + INTERVAL '1 day' * $1
            AND e.status = 'scheduled'
        `;
        const values = [days];

        if (batchId) {
            query += ' AND $2 = ANY(e.batch_ids)';
            values.push(batchId);
        }

        query += ' ORDER BY e.exam_date ASC';
        return db.getMany(query, values);
    }

    // Delete exam
    static async delete(id) {
        const query = `
            UPDATE exams SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 RETURNING *
        `;
        return db.getOne(query, [id]);
    }
}

module.exports = Exam;
