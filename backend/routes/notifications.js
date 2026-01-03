const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');
const notificationService = require('../services/notificationService');

// Get notification templates
router.get('/templates', async (req, res) => {
    try {
        const templates = await db.getMany(`
            SELECT * FROM notification_templates
            WHERE is_active = true
            ORDER BY name
        `);

        res.json({
            success: true,
            data: templates
        });

    } catch (error) {
        logger.error('Get templates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch templates',
            error: error.message
        });
    }
});

// Get notification logs
router.get('/logs', async (req, res) => {
    try {
        const filters = {
            channel: req.query.channel,
            status: req.query.status,
            reference_type: req.query.reference_type,
            limit: parseInt(req.query.limit) || 100
        };

        let query = `
            SELECT n.*, nt.name as template_name
            FROM notifications n
            LEFT JOIN notification_templates nt ON n.template_id = nt.id
            WHERE 1=1
        `;
        const values = [];
        let paramCount = 0;

        if (filters.channel) {
            paramCount++;
            query += ` AND n.channel = $${paramCount}`;
            values.push(filters.channel);
        }

        if (filters.status) {
            paramCount++;
            query += ` AND n.status = $${paramCount}`;
            values.push(filters.status);
        }

        if (filters.reference_type) {
            paramCount++;
            query += ` AND n.reference_type = $${paramCount}`;
            values.push(filters.reference_type);
        }

        query += ` ORDER BY n.created_at DESC LIMIT $${paramCount + 1}`;
        values.push(filters.limit);

        const logs = await db.getMany(query, values);

        res.json({
            success: true,
            count: logs.length,
            data: logs
        });

    } catch (error) {
        logger.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notification logs',
            error: error.message
        });
    }
});

// Send custom notification
router.post('/send', async (req, res) => {
    try {
        const { channel, recipient_phone, recipient_email, subject, body, reference_type, reference_id } = req.body;

        if (!channel || !body) {
            return res.status(400).json({
                success: false,
                message: 'Channel and body are required'
            });
        }

        if (channel === 'email' && !recipient_email) {
            return res.status(400).json({
                success: false,
                message: 'Email address is required for email notifications'
            });
        }

        if (['sms', 'whatsapp'].includes(channel) && !recipient_phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required for SMS/WhatsApp notifications'
            });
        }

        const result = await notificationService.send({
            channel,
            recipient_phone,
            recipient_email,
            subject,
            body,
            reference_type,
            reference_id
        });

        res.json({
            success: true,
            message: 'Notification sent successfully',
            data: result
        });

    } catch (error) {
        logger.error('Send notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send notification',
            error: error.message
        });
    }
});

// Send bulk notifications
router.post('/send-bulk', async (req, res) => {
    try {
        const { channel, template_code, recipients, variables } = req.body;

        if (!channel || !recipients || !Array.isArray(recipients)) {
            return res.status(400).json({
                success: false,
                message: 'Channel and recipients array are required'
            });
        }

        const results = await notificationService.sendBulk({
            channel,
            template_code,
            recipients,
            variables
        });

        res.json({
            success: true,
            message: `Sent ${results.success} of ${recipients.length} notifications`,
            data: results
        });

    } catch (error) {
        logger.error('Send bulk notification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send bulk notifications',
            error: error.message
        });
    }
});

// Create announcement
router.post('/announcements', async (req, res) => {
    try {
        const { title, content, target_audience, channels, batch_ids, is_urgent } = req.body;

        if (!title || !content || !channels) {
            return res.status(400).json({
                success: false,
                message: 'Title, content, and channels are required'
            });
        }

        const announcement = await db.insert(`
            INSERT INTO announcements (title, content, target_audience, channels, batch_ids, is_urgent, is_published, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, true, $7)
            RETURNING *
        `, [title, content, target_audience || ['all'], channels, batch_ids, is_urgent || false, req.user?.id]);

        // Send notifications based on channels
        // This would typically be handled by a background job
        
        res.status(201).json({
            success: true,
            message: 'Announcement created and published',
            data: announcement
        });

    } catch (error) {
        logger.error('Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create announcement',
            error: error.message
        });
    }
});

// Get announcements
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await db.getMany(`
            SELECT a.*, u.email as created_by_email
            FROM announcements a
            LEFT JOIN users u ON a.created_by = u.id
            WHERE (a.expire_at IS NULL OR a.expire_at > CURRENT_TIMESTAMP)
            ORDER BY a.is_urgent DESC, a.created_at DESC
            LIMIT 50
        `);

        res.json({
            success: true,
            data: announcements
        });

    } catch (error) {
        logger.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch announcements',
            error: error.message
        });
    }
});

// Trigger fee reminders manually
router.post('/trigger/fee-reminders', async (req, res) => {
    try {
        const { days_before } = req.body;
        const feeReminderService = require('../services/feeReminderService');
        
        const result = await feeReminderService.sendReminders(days_before);

        res.json({
            success: true,
            message: `Fee reminders sent`,
            data: result
        });

    } catch (error) {
        logger.error('Trigger fee reminders error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger fee reminders',
            error: error.message
        });
    }
});

// Trigger attendance alerts manually
router.post('/trigger/attendance-alerts', async (req, res) => {
    try {
        const attendanceAlertService = require('../services/attendanceAlertService');
        
        const result = await attendanceAlertService.sendAbsenceAlerts();

        res.json({
            success: true,
            message: 'Attendance alerts sent',
            data: result
        });

    } catch (error) {
        logger.error('Trigger attendance alerts error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger attendance alerts',
            error: error.message
        });
    }
});

module.exports = router;
