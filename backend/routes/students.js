const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const logger = require('../config/logger');

// Get all students
router.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            target_exam: req.query.target_exam,
            batch_id: req.query.batch_id,
            search: req.query.search,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };

        const students = await Student.findAll(filters);

        res.json({
            success: true,
            count: students.length,
            data: students
        });

    } catch (error) {
        logger.error('Get students error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
});

// Get student by ID
router.get('/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: student
        });

    } catch (error) {
        logger.error('Get student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student',
            error: error.message
        });
    }
});

// Create new student
router.post('/', async (req, res) => {
    try {
        const { first_name, last_name, phone } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, and phone are required'
            });
        }

        // Check if phone already exists
        const existing = await Student.findByPhone(phone);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A student with this phone number already exists'
            });
        }

        const student = await Student.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Student created successfully',
            data: student
        });

    } catch (error) {
        logger.error('Create student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create student',
            error: error.message
        });
    }
});

// Update student
router.put('/:id', async (req, res) => {
    try {
        const student = await Student.update(req.params.id, req.body);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found or no changes made'
            });
        }

        res.json({
            success: true,
            message: 'Student updated successfully',
            data: student
        });

    } catch (error) {
        logger.error('Update student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update student',
            error: error.message
        });
    }
});

// Enroll student
router.post('/:id/enroll', async (req, res) => {
    try {
        const { batch_id } = req.body;

        if (!batch_id) {
            return res.status(400).json({
                success: false,
                message: 'Batch ID is required'
            });
        }

        const student = await Student.enroll(req.params.id, batch_id);

        res.json({
            success: true,
            message: 'Student enrolled successfully',
            data: student
        });

    } catch (error) {
        logger.error('Enroll student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enroll student',
            error: error.message
        });
    }
});

// Get student performance
router.get('/:id/performance', async (req, res) => {
    try {
        const Exam = require('../models/Exam');
        const results = await Exam.getStudentResults(req.params.id, req.query.limit || 20);

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        logger.error('Get performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance',
            error: error.message
        });
    }
});

// Get student attendance
router.get('/:id/attendance', async (req, res) => {
    try {
        const Attendance = require('../models/Attendance');
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const attendance = await Attendance.getStudentSummary(req.params.id, startDate, endDate);

        res.json({
            success: true,
            data: attendance
        });

    } catch (error) {
        logger.error('Get attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance',
            error: error.message
        });
    }
});

// Get student fees
router.get('/:id/fees', async (req, res) => {
    try {
        const Fee = require('../models/Fee');
        const fees = await Fee.findByStudent(req.params.id);

        res.json({
            success: true,
            data: fees
        });

    } catch (error) {
        logger.error('Get fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fees',
            error: error.message
        });
    }
});

// Get students with low attendance
router.get('/reports/low-attendance', async (req, res) => {
    try {
        const threshold = req.query.threshold || 75;
        const students = await Student.getLowAttendance(threshold);

        res.json({
            success: true,
            count: students.length,
            data: students
        });

    } catch (error) {
        logger.error('Get low attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch low attendance students',
            error: error.message
        });
    }
});

// Get student count by status
router.get('/reports/count-by-status', async (req, res) => {
    try {
        const counts = await Student.getCountByStatus();

        res.json({
            success: true,
            data: counts
        });

    } catch (error) {
        logger.error('Get count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student counts',
            error: error.message
        });
    }
});

// Delete student (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const student = await Student.delete(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            message: 'Student deactivated successfully',
            data: student
        });

    } catch (error) {
        logger.error('Delete student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete student',
            error: error.message
        });
    }
});

module.exports = router;
