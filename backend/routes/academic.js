const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Syllabus = require('../models/Syllabus');
const db = require('../config/database');
const logger = require('../config/logger');
const { authenticateToken, authorizeRoles } = require('./auth');

// ===========================================
// COURSE MANAGEMENT
// ===========================================

// Get all courses (public - for inquiries)
router.get('/courses', async (req, res) => {
    try {
        const { course_type, is_active } = req.query;
        const courses = await Course.getAll({
            course_type,
            is_active: is_active !== 'false'
        });

        res.json({
            success: true,
            data: courses
        });
    } catch (error) {
        logger.error('Error fetching courses:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses' });
    }
});

// Get course templates (predefined course structures)
router.get('/courses/templates', (req, res) => {
    res.json({
        success: true,
        data: Course.COURSE_TEMPLATES
    });
});

// Get course details with batches and syllabus
router.get('/courses/:id', async (req, res) => {
    try {
        const course = await Course.getById(req.params.id);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        res.json({ success: true, data: course });
    } catch (error) {
        logger.error('Error fetching course:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch course' });
    }
});

// Get fee structure for a course
router.get('/courses/:id/fees', async (req, res) => {
    try {
        const feeStructure = await Course.getFeeStructure(req.params.id);
        if (!feeStructure) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        res.json({ success: true, data: feeStructure });
    } catch (error) {
        logger.error('Error fetching fee structure:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch fee structure' });
    }
});

// Create new course (admin only)
router.post('/courses', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const course = await Course.create(req.body);
        res.status(201).json({
            success: true,
            message: 'Course created successfully',
            data: course
        });
    } catch (error) {
        logger.error('Error creating course:', error);
        res.status(500).json({ success: false, message: 'Failed to create course' });
    }
});

// Update course
router.put('/courses/:id', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const course = await Course.update(req.params.id, req.body);
        res.json({
            success: true,
            message: 'Course updated successfully',
            data: course
        });
    } catch (error) {
        logger.error('Error updating course:', error);
        res.status(500).json({ success: false, message: 'Failed to update course' });
    }
});

// ===========================================
// BATCH MANAGEMENT
// ===========================================

// Get all batches with filters
router.get('/batches', async (req, res) => {
    try {
        const { course_id, batch_type, is_active, faculty_id } = req.query;
        
        let query = `
            SELECT b.*, 
                c.name as course_name,
                c.course_type,
                f.first_name || ' ' || f.last_name as faculty_name,
                COUNT(DISTINCT sb.student_id) as enrolled_count,
                b.max_students - COUNT(DISTINCT sb.student_id) as available_seats
            FROM batches b
            JOIN courses c ON c.id = b.course_id
            LEFT JOIN faculty f ON f.id = b.faculty_id
            LEFT JOIN student_batches sb ON sb.batch_id = b.id AND sb.status = 'active'
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (course_id) {
            query += ` AND b.course_id = $${paramIndex++}`;
            params.push(course_id);
        }
        if (batch_type) {
            query += ` AND b.batch_type = $${paramIndex++}`;
            params.push(batch_type);
        }
        if (is_active !== undefined) {
            query += ` AND b.is_active = $${paramIndex++}`;
            params.push(is_active === 'true');
        }
        if (faculty_id) {
            query += ` AND b.faculty_id = $${paramIndex++}`;
            params.push(faculty_id);
        }

        query += ` GROUP BY b.id, c.name, c.course_type, f.first_name, f.last_name ORDER BY b.start_time`;

        const result = await db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error('Error fetching batches:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch batches' });
    }
});

// Get batch details with students
router.get('/batches/:id', authenticateToken, async (req, res) => {
    try {
        const batch = await db.getOne(`
            SELECT b.*, 
                c.name as course_name,
                f.first_name || ' ' || f.last_name as faculty_name,
                f.phone as faculty_phone
            FROM batches b
            JOIN courses c ON c.id = b.course_id
            LEFT JOIN faculty f ON f.id = b.faculty_id
            WHERE b.id = $1
        `, [req.params.id]);

        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        // Get enrolled students
        const students = await db.getMany(`
            SELECT s.id, s.first_name, s.last_name, s.phone, s.photo_url,
                sb.enrolled_date, sb.status
            FROM students s
            JOIN student_batches sb ON sb.student_id = s.id
            WHERE sb.batch_id = $1
            ORDER BY s.first_name
        `, [req.params.id]);

        batch.students = students;
        batch.enrolled_count = students.filter(s => s.status === 'active').length;

        res.json({ success: true, data: batch });
    } catch (error) {
        logger.error('Error fetching batch:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch batch' });
    }
});

// Get batch timings summary
router.get('/batches/timings/summary', async (req, res) => {
    try {
        const timings = await db.getMany(`
            SELECT 
                c.course_type,
                c.name as course_name,
                b.name as batch_name,
                b.batch_type,
                b.start_time,
                b.end_time,
                b.days_of_week,
                f.first_name || ' ' || f.last_name as faculty_name,
                b.max_students - COUNT(sb.id) as available_seats
            FROM batches b
            JOIN courses c ON c.id = b.course_id
            LEFT JOIN faculty f ON f.id = b.faculty_id
            LEFT JOIN student_batches sb ON sb.batch_id = b.id AND sb.status = 'active'
            WHERE b.is_active = true
            GROUP BY b.id, c.course_type, c.name, f.first_name, f.last_name
            ORDER BY c.course_type, b.start_time
        `);

        res.json({ success: true, data: timings });
    } catch (error) {
        logger.error('Error fetching batch timings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch batch timings' });
    }
});

// Create batch
router.post('/batches', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const {
            course_id, name, batch_type, faculty_id, start_time, end_time,
            days_of_week, max_students, room_number, start_date, end_date
        } = req.body;

        const batch = await db.insert(`
            INSERT INTO batches (
                course_id, name, batch_type, faculty_id, start_time, end_time,
                days_of_week, max_students, room_number, start_date, end_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `, [course_id, name, batch_type, faculty_id, start_time, end_time,
            days_of_week, max_students || 30, room_number, start_date, end_date]);

        res.status(201).json({
            success: true,
            message: 'Batch created successfully',
            data: batch
        });
    } catch (error) {
        logger.error('Error creating batch:', error);
        res.status(500).json({ success: false, message: 'Failed to create batch' });
    }
});

// Allocate student to batch
router.post('/batches/:id/students', authenticateToken, authorizeRoles('admin', 'manager', 'counselor'), async (req, res) => {
    try {
        const { student_id } = req.body;
        const batchId = req.params.id;

        // Check batch capacity
        const batch = await db.getOne(`
            SELECT b.*, COUNT(sb.id) as current_count
            FROM batches b
            LEFT JOIN student_batches sb ON sb.batch_id = b.id AND sb.status = 'active'
            WHERE b.id = $1
            GROUP BY b.id
        `, [batchId]);

        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        if (batch.current_count >= batch.max_students) {
            return res.status(400).json({ success: false, message: 'Batch is full' });
        }

        // Check if student already in batch
        const existing = await db.getOne(`
            SELECT * FROM student_batches 
            WHERE student_id = $1 AND batch_id = $2
        `, [student_id, batchId]);

        if (existing) {
            if (existing.status === 'active') {
                return res.status(400).json({ success: false, message: 'Student already in this batch' });
            }
            // Reactivate
            await db.update(`
                UPDATE student_batches SET status = 'active', enrolled_date = CURRENT_DATE
                WHERE id = $1
            `, [existing.id]);
        } else {
            await db.insert(`
                INSERT INTO student_batches (student_id, batch_id, status, enrolled_date)
                VALUES ($1, $2, 'active', CURRENT_DATE)
            `, [student_id, batchId]);
        }

        res.json({
            success: true,
            message: 'Student allocated to batch successfully'
        });
    } catch (error) {
        logger.error('Error allocating student:', error);
        res.status(500).json({ success: false, message: 'Failed to allocate student' });
    }
});

// Upgrade/transfer student to different batch
router.put('/batches/:id/students/:studentId/transfer', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const { new_batch_id, reason } = req.body;
        const { id: oldBatchId, studentId } = req.params;

        // Deactivate from old batch
        await db.update(`
            UPDATE student_batches 
            SET status = 'transferred', transfer_reason = $1
            WHERE student_id = $2 AND batch_id = $3
        `, [reason, studentId, oldBatchId]);

        // Add to new batch
        await db.insert(`
            INSERT INTO student_batches (student_id, batch_id, status, enrolled_date)
            VALUES ($1, $2, 'active', CURRENT_DATE)
        `, [studentId, new_batch_id]);

        res.json({
            success: true,
            message: 'Student transferred successfully'
        });
    } catch (error) {
        logger.error('Error transferring student:', error);
        res.status(500).json({ success: false, message: 'Failed to transfer student' });
    }
});

// ===========================================
// SYLLABUS MANAGEMENT
// ===========================================

// Get syllabus for a course
router.get('/courses/:id/syllabus', async (req, res) => {
    try {
        const syllabus = await Syllabus.getByCourse(req.params.id);
        res.json({ success: true, data: syllabus });
    } catch (error) {
        logger.error('Error fetching syllabus:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch syllabus' });
    }
});

// Get syllabus coverage for a batch
router.get('/batches/:id/syllabus-coverage', authenticateToken, async (req, res) => {
    try {
        const coverage = await Syllabus.getBatchCoverage(req.params.id);
        res.json({ success: true, data: coverage });
    } catch (error) {
        logger.error('Error fetching syllabus coverage:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch syllabus coverage' });
    }
});

// Update syllabus coverage (faculty marks chapter as completed)
router.post('/batches/:id/syllabus-coverage', authenticateToken, authorizeRoles('admin', 'manager', 'faculty'), async (req, res) => {
    try {
        const { syllabus_id, is_completed, notes } = req.body;
        
        const coverage = await Syllabus.updateCoverage({
            batch_id: req.params.id,
            syllabus_id,
            is_completed,
            completion_date: is_completed ? new Date() : null,
            faculty_id: req.user.id,
            notes
        });

        res.json({
            success: true,
            message: 'Syllabus coverage updated',
            data: coverage
        });
    } catch (error) {
        logger.error('Error updating syllabus coverage:', error);
        res.status(500).json({ success: false, message: 'Failed to update syllabus coverage' });
    }
});

// Add syllabus chapter
router.post('/courses/:id/syllabus', authenticateToken, authorizeRoles('admin', 'manager'), async (req, res) => {
    try {
        const chapter = await Syllabus.createChapter({
            course_id: req.params.id,
            ...req.body
        });

        res.status(201).json({
            success: true,
            message: 'Chapter added to syllabus',
            data: chapter
        });
    } catch (error) {
        logger.error('Error adding syllabus chapter:', error);
        res.status(500).json({ success: false, message: 'Failed to add chapter' });
    }
});

// ===========================================
// FACULTY INFO (Public for inquiries)
// ===========================================

// Get faculty list with their subjects and batches
router.get('/faculty-info', async (req, res) => {
    try {
        const faculty = await db.getMany(`
            SELECT 
                f.id,
                f.first_name || ' ' || f.last_name as name,
                f.photo_url,
                f.qualification,
                f.experience_years,
                f.specialization,
                f.bio,
                json_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as subjects,
                json_agg(DISTINCT jsonb_build_object(
                    'batch_name', b.name,
                    'course_name', c.name,
                    'timing', b.start_time || ' - ' || b.end_time
                )) FILTER (WHERE b.id IS NOT NULL) as batches
            FROM faculty f
            LEFT JOIN faculty_subjects fs ON fs.faculty_id = f.id
            LEFT JOIN subjects s ON s.id = fs.subject_id
            LEFT JOIN batches b ON b.faculty_id = f.id AND b.is_active = true
            LEFT JOIN courses c ON c.id = b.course_id
            WHERE f.is_active = true
            GROUP BY f.id
            ORDER BY f.experience_years DESC
        `);

        res.json({ success: true, data: faculty });
    } catch (error) {
        logger.error('Error fetching faculty info:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch faculty info' });
    }
});

// ===========================================
// SUBJECTS
// ===========================================

// Get all subjects
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await db.getMany(`
            SELECT * FROM subjects ORDER BY name
        `);
        res.json({ success: true, data: subjects });
    } catch (error) {
        logger.error('Error fetching subjects:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch subjects' });
    }
});

module.exports = router;
