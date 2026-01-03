const db = require('../config/database');
const logger = require('../config/logger');

class Course {
    // Course Templates for different programs
    static COURSE_TEMPLATES = {
        'class_9': {
            name: 'Class 9 Foundation',
            subjects: ['Mathematics', 'Science', 'English', 'Social Studies'],
            duration_months: 12,
            total_fee: 45000
        },
        'class_10': {
            name: 'Class 10 Board Prep',
            subjects: ['Mathematics', 'Science', 'English', 'Social Studies'],
            duration_months: 12,
            total_fee: 50000
        },
        'class_11_pcm': {
            name: 'Class 11 PCM',
            subjects: ['Physics', 'Chemistry', 'Mathematics'],
            duration_months: 12,
            total_fee: 75000
        },
        'class_11_pcb': {
            name: 'Class 11 PCB',
            subjects: ['Physics', 'Chemistry', 'Biology'],
            duration_months: 12,
            total_fee: 75000
        },
        'class_12_pcm': {
            name: 'Class 12 PCM',
            subjects: ['Physics', 'Chemistry', 'Mathematics'],
            duration_months: 12,
            total_fee: 85000
        },
        'class_12_pcb': {
            name: 'Class 12 PCB',
            subjects: ['Physics', 'Chemistry', 'Biology'],
            duration_months: 12,
            total_fee: 85000
        },
        'iit_jee': {
            name: 'IIT-JEE Preparation',
            subjects: ['Physics', 'Chemistry', 'Mathematics'],
            duration_months: 24,
            total_fee: 150000
        },
        'iit_jee_advanced': {
            name: 'IIT-JEE Advanced',
            subjects: ['Physics', 'Chemistry', 'Mathematics'],
            duration_months: 12,
            total_fee: 120000
        },
        'neet': {
            name: 'NEET Preparation',
            subjects: ['Physics', 'Chemistry', 'Biology'],
            duration_months: 24,
            total_fee: 145000
        },
        'foundation_8_10': {
            name: 'Foundation (Class 8-10)',
            subjects: ['Mathematics', 'Science', 'Mental Ability'],
            duration_months: 12,
            total_fee: 40000
        }
    };

    // Get all courses
    static async getAll(filters = {}) {
        try {
            let query = `
                SELECT c.*, 
                    COUNT(DISTINCT b.id) as batch_count,
                    COUNT(DISTINCT sb.student_id) as enrolled_students
                FROM courses c
                LEFT JOIN batches b ON b.course_id = c.id AND b.is_active = true
                LEFT JOIN student_batches sb ON sb.batch_id = b.id AND sb.status = 'active'
                WHERE 1=1
            `;
            const params = [];
            let paramIndex = 1;

            if (filters.course_type) {
                query += ` AND c.course_type = $${paramIndex++}`;
                params.push(filters.course_type);
            }

            if (filters.is_active !== undefined) {
                query += ` AND c.is_active = $${paramIndex++}`;
                params.push(filters.is_active);
            }

            query += ` GROUP BY c.id ORDER BY c.course_type, c.name`;

            const result = await db.query(query, params);
            return result.rows;
        } catch (error) {
            logger.error('Error fetching courses:', error);
            throw error;
        }
    }

    // Get course by ID with full details
    static async getById(id) {
        try {
            const course = await db.getOne(`
                SELECT c.*,
                    json_agg(DISTINCT jsonb_build_object(
                        'id', s.id,
                        'name', s.name,
                        'code', s.code
                    )) FILTER (WHERE s.id IS NOT NULL) as subjects
                FROM courses c
                LEFT JOIN course_subjects cs ON cs.course_id = c.id
                LEFT JOIN subjects s ON s.id = cs.subject_id
                WHERE c.id = $1
                GROUP BY c.id
            `, [id]);

            if (course) {
                // Get batches for this course
                const batches = await db.getMany(`
                    SELECT b.*, f.first_name || ' ' || f.last_name as faculty_name,
                        COUNT(sb.id) as enrolled_count
                    FROM batches b
                    LEFT JOIN faculty f ON f.id = b.faculty_id
                    LEFT JOIN student_batches sb ON sb.batch_id = b.id AND sb.status = 'active'
                    WHERE b.course_id = $1 AND b.is_active = true
                    GROUP BY b.id, f.first_name, f.last_name
                    ORDER BY b.start_time
                `, [id]);
                course.batches = batches;

                // Get syllabus
                const syllabus = await db.getMany(`
                    SELECT * FROM syllabus
                    WHERE course_id = $1
                    ORDER BY subject_id, chapter_order
                `, [id]);
                course.syllabus = syllabus;
            }

            return course;
        } catch (error) {
            logger.error('Error fetching course:', error);
            throw error;
        }
    }

    // Create new course
    static async create(data) {
        try {
            const result = await db.insert(`
                INSERT INTO courses (
                    name, code, course_type, description, duration_months,
                    total_fee, discount_available, max_discount_percent,
                    is_active, academic_year
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING *
            `, [
                data.name,
                data.code,
                data.course_type,
                data.description,
                data.duration_months,
                data.total_fee,
                data.discount_available || false,
                data.max_discount_percent || 0,
                data.is_active !== false,
                data.academic_year || new Date().getFullYear()
            ]);
            return result;
        } catch (error) {
            logger.error('Error creating course:', error);
            throw error;
        }
    }

    // Update course
    static async update(id, data) {
        try {
            const fields = [];
            const values = [];
            let paramIndex = 1;

            const allowedFields = [
                'name', 'code', 'course_type', 'description', 'duration_months',
                'total_fee', 'discount_available', 'max_discount_percent', 'is_active'
            ];

            for (const field of allowedFields) {
                if (data[field] !== undefined) {
                    fields.push(`${field} = $${paramIndex++}`);
                    values.push(data[field]);
                }
            }

            if (fields.length === 0) return null;

            fields.push(`updated_at = CURRENT_TIMESTAMP`);
            values.push(id);

            const result = await db.getOne(`
                UPDATE courses SET ${fields.join(', ')}
                WHERE id = $${paramIndex}
                RETURNING *
            `, values);

            return result;
        } catch (error) {
            logger.error('Error updating course:', error);
            throw error;
        }
    }

    // Get course fee structure
    static async getFeeStructure(courseId) {
        try {
            const course = await db.getOne(`
                SELECT id, name, course_type, total_fee, 
                    discount_available, max_discount_percent,
                    duration_months
                FROM courses WHERE id = $1
            `, [courseId]);

            if (!course) return null;

            // Calculate installment options
            const installmentOptions = [
                {
                    plan: 'Full Payment',
                    installments: 1,
                    amount_per_installment: course.total_fee,
                    total_amount: course.total_fee,
                    discount_percent: course.discount_available ? 5 : 0
                },
                {
                    plan: 'Two Installments',
                    installments: 2,
                    amount_per_installment: Math.ceil(course.total_fee / 2),
                    total_amount: course.total_fee,
                    discount_percent: course.discount_available ? 2 : 0
                },
                {
                    plan: 'Quarterly',
                    installments: 4,
                    amount_per_installment: Math.ceil(course.total_fee / 4),
                    total_amount: course.total_fee,
                    discount_percent: 0
                },
                {
                    plan: 'Monthly',
                    installments: course.duration_months,
                    amount_per_installment: Math.ceil(course.total_fee / course.duration_months),
                    total_amount: course.total_fee,
                    discount_percent: 0
                }
            ];

            return {
                course,
                installment_options: installmentOptions,
                scholarships: [
                    { name: 'Merit Scholarship', discount: '10-25%', criteria: 'Based on entrance test score' },
                    { name: 'Sibling Discount', discount: '10%', criteria: 'Sibling already enrolled' },
                    { name: 'Early Bird', discount: '5%', criteria: 'Enrollment before deadline' }
                ]
            };
        } catch (error) {
            logger.error('Error fetching fee structure:', error);
            throw error;
        }
    }
}

module.exports = Course;
