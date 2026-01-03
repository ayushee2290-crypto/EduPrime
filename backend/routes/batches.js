const express = require('express');
const router = express.Router();
const Batch = require('../models/Batch');
const logger = require('../config/logger');

// Get all batches
router.get('/', async (req, res) => {
    try {
        const filters = {
            is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
            course_id: req.query.course_id,
            batch_type: req.query.batch_type,
            academic_year: req.query.academic_year,
            search: req.query.search
        };

        const batches = await Batch.findAll(filters);

        res.json({
            success: true,
            count: batches.length,
            data: batches
        });

    } catch (error) {
        logger.error('Get batches error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch batches',
            error: error.message
        });
    }
});

// Get batch by ID
router.get('/:id', async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        res.json({
            success: true,
            data: batch
        });

    } catch (error) {
        logger.error('Get batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch batch',
            error: error.message
        });
    }
});

// Create new batch
router.post('/', async (req, res) => {
    try {
        const { name, code, start_date } = req.body;

        if (!name || !code || !start_date) {
            return res.status(400).json({
                success: false,
                message: 'Name, code, and start_date are required'
            });
        }

        // Check if code already exists
        const existing = await Batch.findByCode(code);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A batch with this code already exists'
            });
        }

        const batch = await Batch.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Batch created successfully',
            data: batch
        });

    } catch (error) {
        logger.error('Create batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create batch',
            error: error.message
        });
    }
});

// Update batch
router.put('/:id', async (req, res) => {
    try {
        const batch = await Batch.update(req.params.id, req.body);

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found or no changes made'
            });
        }

        res.json({
            success: true,
            message: 'Batch updated successfully',
            data: batch
        });

    } catch (error) {
        logger.error('Update batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update batch',
            error: error.message
        });
    }
});

// Get students in batch
router.get('/:id/students', async (req, res) => {
    try {
        const students = await Batch.getStudents(req.params.id);

        res.json({
            success: true,
            count: students.length,
            data: students
        });

    } catch (error) {
        logger.error('Get batch students error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
});

// Add student to batch
router.post('/:id/students', async (req, res) => {
    try {
        const { student_id, roll_number } = req.body;

        if (!student_id) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required'
            });
        }

        const enrollment = await Batch.addStudent(req.params.id, student_id, roll_number);

        res.json({
            success: true,
            message: 'Student added to batch successfully',
            data: enrollment
        });

    } catch (error) {
        logger.error('Add student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add student to batch',
            error: error.message
        });
    }
});

// Remove student from batch
router.delete('/:id/students/:studentId', async (req, res) => {
    try {
        await Batch.removeStudent(req.params.id, req.params.studentId);

        res.json({
            success: true,
            message: 'Student removed from batch successfully'
        });

    } catch (error) {
        logger.error('Remove student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove student from batch',
            error: error.message
        });
    }
});

// Get batch timetable
router.get('/:id/timetable', async (req, res) => {
    try {
        const timetable = await Batch.getTimetable(req.params.id);

        res.json({
            success: true,
            data: timetable
        });

    } catch (error) {
        logger.error('Get timetable error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch timetable',
            error: error.message
        });
    }
});

// Get batch performance
router.get('/:id/performance', async (req, res) => {
    try {
        const performance = await Batch.getPerformance(req.params.id);

        res.json({
            success: true,
            data: performance
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

// Get syllabus progress
router.get('/:id/syllabus-progress', async (req, res) => {
    try {
        const progress = await Batch.getSyllabusProgress(req.params.id);

        res.json({
            success: true,
            data: progress
        });

    } catch (error) {
        logger.error('Get syllabus progress error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch syllabus progress',
            error: error.message
        });
    }
});

// Delete batch (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const batch = await Batch.delete(req.params.id);

        if (!batch) {
            return res.status(404).json({
                success: false,
                message: 'Batch not found'
            });
        }

        res.json({
            success: true,
            message: 'Batch deactivated successfully',
            data: batch
        });

    } catch (error) {
        logger.error('Delete batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete batch',
            error: error.message
        });
    }
});

module.exports = router;
