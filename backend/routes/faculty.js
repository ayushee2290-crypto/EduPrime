const express = require('express');
const router = express.Router();
const Faculty = require('../models/Faculty');
const logger = require('../config/logger');

// Get all faculty
router.get('/', async (req, res) => {
    try {
        const filters = {
            is_active: req.query.is_active !== undefined ? req.query.is_active === 'true' : undefined,
            subject_id: req.query.subject_id,
            department: req.query.department,
            search: req.query.search
        };

        const faculty = await Faculty.findAll(filters);

        res.json({
            success: true,
            count: faculty.length,
            data: faculty
        });

    } catch (error) {
        logger.error('Get faculty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty',
            error: error.message
        });
    }
});

// Get faculty by ID
router.get('/:id', async (req, res) => {
    try {
        const faculty = await Faculty.findById(req.params.id);

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found'
            });
        }

        res.json({
            success: true,
            data: faculty
        });

    } catch (error) {
        logger.error('Get faculty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty',
            error: error.message
        });
    }
});

// Create new faculty
router.post('/', async (req, res) => {
    try {
        const { first_name, last_name, email, phone } = req.body;

        if (!first_name || !last_name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, email, and phone are required'
            });
        }

        // Check if email already exists
        const existing = await Faculty.findByEmail(email);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A faculty member with this email already exists'
            });
        }

        const faculty = await Faculty.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Faculty created successfully',
            data: faculty
        });

    } catch (error) {
        logger.error('Create faculty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create faculty',
            error: error.message
        });
    }
});

// Update faculty
router.put('/:id', async (req, res) => {
    try {
        const faculty = await Faculty.update(req.params.id, req.body);

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found or no changes made'
            });
        }

        res.json({
            success: true,
            message: 'Faculty updated successfully',
            data: faculty
        });

    } catch (error) {
        logger.error('Update faculty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update faculty',
            error: error.message
        });
    }
});

// Assign faculty to batch
router.post('/:id/assign-batch', async (req, res) => {
    try {
        const { batch_id, subject_id, is_primary } = req.body;

        if (!batch_id || !subject_id) {
            return res.status(400).json({
                success: false,
                message: 'Batch ID and Subject ID are required'
            });
        }

        const assignment = await Faculty.assignToBatch(
            req.params.id, batch_id, subject_id, is_primary !== false
        );

        res.json({
            success: true,
            message: 'Faculty assigned to batch successfully',
            data: assignment
        });

    } catch (error) {
        logger.error('Assign batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign faculty to batch',
            error: error.message
        });
    }
});

// Remove faculty from batch
router.delete('/:id/remove-batch/:batchId', async (req, res) => {
    try {
        await Faculty.removeFromBatch(req.params.id, req.params.batchId);

        res.json({
            success: true,
            message: 'Faculty removed from batch successfully'
        });

    } catch (error) {
        logger.error('Remove batch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove faculty from batch',
            error: error.message
        });
    }
});

// Get faculty schedule
router.get('/:id/schedule', async (req, res) => {
    try {
        const schedule = await Faculty.getSchedule(req.params.id, req.query.date);

        res.json({
            success: true,
            data: schedule
        });

    } catch (error) {
        logger.error('Get schedule error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch schedule',
            error: error.message
        });
    }
});

// Get faculty workload
router.get('/:id/workload', async (req, res) => {
    try {
        const workload = await Faculty.getWorkloadSummary(req.params.id);

        res.json({
            success: true,
            data: workload
        });

    } catch (error) {
        logger.error('Get workload error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch workload',
            error: error.message
        });
    }
});

// Get available faculty for substitution
router.get('/available/substitution', async (req, res) => {
    try {
        const { day, start_time, end_time, subject_id } = req.query;

        if (!day || !start_time || !end_time || !subject_id) {
            return res.status(400).json({
                success: false,
                message: 'Day, start_time, end_time, and subject_id are required'
            });
        }

        const faculty = await Faculty.getAvailableForSubstitution(
            day, start_time, end_time, subject_id
        );

        res.json({
            success: true,
            count: faculty.length,
            data: faculty
        });

    } catch (error) {
        logger.error('Get available faculty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available faculty',
            error: error.message
        });
    }
});

// Delete faculty (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const faculty = await Faculty.delete(req.params.id);

        if (!faculty) {
            return res.status(404).json({
                success: false,
                message: 'Faculty not found'
            });
        }

        res.json({
            success: true,
            message: 'Faculty deactivated successfully',
            data: faculty
        });

    } catch (error) {
        logger.error('Delete faculty error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete faculty',
            error: error.message
        });
    }
});

module.exports = router;
