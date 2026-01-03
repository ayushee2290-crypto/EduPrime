const express = require('express');
const router = express.Router();
const Inquiry = require('../models/Inquiry');
const Student = require('../models/Student');
const logger = require('../config/logger');

// Get all inquiries
router.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            target_course: req.query.target_course,
            source: req.query.source,
            counselor_id: req.query.counselor_id,
            follow_up_due: req.query.follow_up_due === 'true',
            search: req.query.search,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined
        };

        const inquiries = await Inquiry.findAll(filters);

        res.json({
            success: true,
            count: inquiries.length,
            data: inquiries
        });

    } catch (error) {
        logger.error('Get inquiries error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inquiries',
            error: error.message
        });
    }
});

// Get follow-ups due today
router.get('/follow-ups/due', async (req, res) => {
    try {
        const followUps = await Inquiry.getFollowUpsDue();

        res.json({
            success: true,
            count: followUps.length,
            data: followUps
        });

    } catch (error) {
        logger.error('Get follow-ups error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch follow-ups',
            error: error.message
        });
    }
});

// Get conversion analytics
router.get('/analytics/conversion', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const analytics = await Inquiry.getConversionAnalytics(startDate, endDate);

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

// Get source analytics
router.get('/analytics/source', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const analytics = await Inquiry.getSourceAnalytics(startDate, endDate);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        logger.error('Get source analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch source analytics',
            error: error.message
        });
    }
});

// Get inquiry by ID
router.get('/:id', async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        res.json({
            success: true,
            data: inquiry
        });

    } catch (error) {
        logger.error('Get inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inquiry',
            error: error.message
        });
    }
});

// Create new inquiry (public endpoint for website/chatbot)
router.post('/', async (req, res) => {
    try {
        const { student_name, phone } = req.body;

        if (!student_name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Student name and phone are required'
            });
        }

        // Check for existing inquiries with same phone
        const existing = await Inquiry.findByPhone(phone);
        if (existing.length > 0 && existing.some(i => i.status !== 'converted' && i.status !== 'lost')) {
            return res.json({
                success: true,
                message: 'We already have your inquiry. Our counselor will contact you soon!',
                data: { existing: true, inquiry_id: existing[0].id }
            });
        }

        const inquiry = await Inquiry.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Thank you for your interest! Our counselor will contact you within 24 hours.',
            data: inquiry
        });

    } catch (error) {
        logger.error('Create inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit inquiry. Please try again.',
            error: error.message
        });
    }
});

// Update inquiry
router.put('/:id', async (req, res) => {
    try {
        const inquiry = await Inquiry.update(req.params.id, req.body);

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found or no changes made'
            });
        }

        res.json({
            success: true,
            message: 'Inquiry updated successfully',
            data: inquiry
        });

    } catch (error) {
        logger.error('Update inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update inquiry',
            error: error.message
        });
    }
});

// Add interaction/follow-up
router.post('/:id/interaction', async (req, res) => {
    try {
        const { type, notes, outcome, next_action, done_by } = req.body;

        if (!type || !notes) {
            return res.status(400).json({
                success: false,
                message: 'Interaction type and notes are required'
            });
        }

        const inquiry = await Inquiry.addInteraction(req.params.id, req.body);

        res.json({
            success: true,
            message: 'Interaction recorded successfully',
            data: inquiry
        });

    } catch (error) {
        logger.error('Add interaction error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record interaction',
            error: error.message
        });
    }
});

// Convert inquiry to student
router.post('/:id/convert', async (req, res) => {
    try {
        const inquiry = await Inquiry.findById(req.params.id);
        
        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        // Create student from inquiry data
        const studentData = {
            first_name: inquiry.student_name.split(' ')[0],
            last_name: inquiry.student_name.split(' ').slice(1).join(' ') || '',
            phone: inquiry.phone,
            email: inquiry.email,
            father_name: inquiry.parent_name,
            father_phone: inquiry.parent_phone,
            current_class: inquiry.current_class,
            target_exam: inquiry.target_course,
            target_year: inquiry.target_year,
            status: 'enrolled',
            ...req.body.student_data
        };

        const student = await Student.create(studentData);
        await Inquiry.convert(req.params.id, student.id);

        res.json({
            success: true,
            message: 'Inquiry converted to student successfully',
            data: { student }
        });

    } catch (error) {
        logger.error('Convert inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert inquiry',
            error: error.message
        });
    }
});

// Mark inquiry as lost
router.post('/:id/lost', async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Reason is required'
            });
        }

        const inquiry = await Inquiry.markLost(req.params.id, reason);

        res.json({
            success: true,
            message: 'Inquiry marked as lost',
            data: inquiry
        });

    } catch (error) {
        logger.error('Mark lost error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark inquiry as lost',
            error: error.message
        });
    }
});

// Delete inquiry
router.delete('/:id', async (req, res) => {
    try {
        const inquiry = await Inquiry.delete(req.params.id);

        if (!inquiry) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found'
            });
        }

        res.json({
            success: true,
            message: 'Inquiry deleted successfully'
        });

    } catch (error) {
        logger.error('Delete inquiry error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete inquiry',
            error: error.message
        });
    }
});

module.exports = router;
