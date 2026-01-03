const express = require('express');
const router = express.Router();
const Exam = require('../models/Exam');
const logger = require('../config/logger');

// Get all exams
router.get('/', async (req, res) => {
    try {
        const filters = {
            exam_type: req.query.exam_type,
            batch_id: req.query.batch_id,
            subject_id: req.query.subject_id,
            course_type: req.query.course_type,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            status: req.query.status
        };

        const exams = await Exam.findAll(filters);

        res.json({
            success: true,
            count: exams.length,
            data: exams
        });

    } catch (error) {
        logger.error('Get exams error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exams',
            error: error.message
        });
    }
});

// Get upcoming exams
router.get('/upcoming', async (req, res) => {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 30;
        const exams = await Exam.getUpcoming(req.query.batch_id, days);

        res.json({
            success: true,
            count: exams.length,
            data: exams
        });

    } catch (error) {
        logger.error('Get upcoming exams error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch upcoming exams',
            error: error.message
        });
    }
});

// Get exam by ID
router.get('/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        res.json({
            success: true,
            data: exam
        });

    } catch (error) {
        logger.error('Get exam error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exam',
            error: error.message
        });
    }
});

// Create new exam
router.post('/', async (req, res) => {
    try {
        const { name, exam_type, exam_date, total_marks } = req.body;

        if (!name || !exam_type || !exam_date || !total_marks) {
            return res.status(400).json({
                success: false,
                message: 'Name, exam type, exam date, and total marks are required'
            });
        }

        const exam = await Exam.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Exam created successfully',
            data: exam
        });

    } catch (error) {
        logger.error('Create exam error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create exam',
            error: error.message
        });
    }
});

// Update exam
router.put('/:id', async (req, res) => {
    try {
        const exam = await Exam.update(req.params.id, req.body);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found or no changes made'
            });
        }

        res.json({
            success: true,
            message: 'Exam updated successfully',
            data: exam
        });

    } catch (error) {
        logger.error('Update exam error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update exam',
            error: error.message
        });
    }
});

// Upload single result
router.post('/:id/results', async (req, res) => {
    try {
        const { student_id, marks_obtained } = req.body;

        if (!student_id || marks_obtained === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Student ID and marks obtained are required'
            });
        }

        const exam = await Exam.findById(req.params.id);
        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        const result = await Exam.uploadResult({
            exam_id: req.params.id,
            total_marks: exam.total_marks,
            ...req.body
        });

        res.json({
            success: true,
            message: 'Result uploaded successfully',
            data: result
        });

    } catch (error) {
        logger.error('Upload result error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload result',
            error: error.message
        });
    }
});

// Upload bulk results
router.post('/:id/results/bulk', async (req, res) => {
    try {
        const { results } = req.body;

        if (!results || !Array.isArray(results)) {
            return res.status(400).json({
                success: false,
                message: 'Results array is required'
            });
        }

        const uploadedResults = await Exam.uploadBulkResults(req.params.id, results);

        res.json({
            success: true,
            message: `${uploadedResults.length} results uploaded successfully`,
            data: uploadedResults
        });

    } catch (error) {
        logger.error('Upload bulk results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload results',
            error: error.message
        });
    }
});

// Get exam results
router.get('/:id/results', async (req, res) => {
    try {
        const results = await Exam.getResults(req.params.id);

        res.json({
            success: true,
            count: results.length,
            data: results
        });

    } catch (error) {
        logger.error('Get results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch results',
            error: error.message
        });
    }
});

// Get performance analytics
router.get('/:id/analytics', async (req, res) => {
    try {
        const analytics = await Exam.getPerformanceAnalytics(req.params.id);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        logger.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch analytics',
            error: error.message
        });
    }
});

// Get topic-wise analysis
router.get('/:id/topic-analysis', async (req, res) => {
    try {
        const analysis = await Exam.getTopicAnalysis(req.params.id);

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        logger.error('Get topic analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch topic analysis',
            error: error.message
        });
    }
});

// Publish results
router.post('/:id/publish', async (req, res) => {
    try {
        const exam = await Exam.publishResults(req.params.id);

        res.json({
            success: true,
            message: 'Results published successfully',
            data: exam
        });

    } catch (error) {
        logger.error('Publish results error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to publish results',
            error: error.message
        });
    }
});

// Delete exam
router.delete('/:id', async (req, res) => {
    try {
        const exam = await Exam.delete(req.params.id);

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: 'Exam not found'
            });
        }

        res.json({
            success: true,
            message: 'Exam cancelled successfully',
            data: exam
        });

    } catch (error) {
        logger.error('Delete exam error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete exam',
            error: error.message
        });
    }
});

module.exports = router;
