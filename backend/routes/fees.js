const express = require('express');
const router = express.Router();
const Fee = require('../models/Fee');
const logger = require('../config/logger');

// List fees (compat endpoint for dashboard UI)
// Supports: /api/fees?status=overdue|pending&limit=5
router.get('/', async (req, res) => {
    try {
        const status = (req.query.status || '').toLowerCase();
        const limit = req.query.limit ? parseInt(req.query.limit) : undefined;

        let items = [];
        if (status === 'overdue') {
            const result = await Fee.getOverdueFees();
            items = result;
        } else if (status === 'pending') {
            const result = await Fee.getPendingFees({});
            items = result;
        } else {
            // Default to pending fees view
            const result = await Fee.getPendingFees({});
            items = result;
        }

        if (limit) items = items.slice(0, limit);
        res.json(items);
    } catch (error) {
        logger.error('List fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fees',
            error: error.message
        });
    }
});

// Get pending fees
router.get('/pending', async (req, res) => {
    try {
        const filters = {
            batch_id: req.query.batch_id,
            days_overdue: req.query.days_overdue ? parseInt(req.query.days_overdue) : undefined,
            due_in_days: req.query.due_in_days ? parseInt(req.query.due_in_days) : undefined
        };

        const fees = await Fee.getPendingFees(filters);

        res.json({
            success: true,
            count: fees.length,
            data: fees
        });

    } catch (error) {
        logger.error('Get pending fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending fees',
            error: error.message
        });
    }
});

// Get overdue fees
router.get('/overdue', async (req, res) => {
    try {
        const fees = await Fee.getOverdueFees();

        res.json({
            success: true,
            count: fees.length,
            data: fees
        });

    } catch (error) {
        logger.error('Get overdue fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch overdue fees',
            error: error.message
        });
    }
});

// Get fees for reminders
router.get('/reminder/:days', async (req, res) => {
    try {
        const fees = await Fee.getFeesForReminder(parseInt(req.params.days));

        res.json({
            success: true,
            count: fees.length,
            data: fees
        });

    } catch (error) {
        logger.error('Get reminder fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fees for reminder',
            error: error.message
        });
    }
});

// Get fee by ID
router.get('/:id', async (req, res) => {
    try {
        const fee = await Fee.findById(req.params.id);

        if (!fee) {
            return res.status(404).json({
                success: false,
                message: 'Fee record not found'
            });
        }

        res.json({
            success: true,
            data: fee
        });

    } catch (error) {
        logger.error('Get fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fee',
            error: error.message
        });
    }
});

// Create fee record for student
router.post('/', async (req, res) => {
    try {
        const { student_id, total_amount, due_date } = req.body;

        if (!student_id || !total_amount || !due_date) {
            return res.status(400).json({
                success: false,
                message: 'Student ID, total amount, and due date are required'
            });
        }

        const fee = await Fee.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Fee record created successfully',
            data: fee
        });

    } catch (error) {
        logger.error('Create fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create fee record',
            error: error.message
        });
    }
});

// Record payment
router.post('/payment', async (req, res) => {
    try {
        const { student_fee_id, student_id, amount, payment_mode } = req.body;

        if (!student_fee_id || !student_id || !amount || !payment_mode) {
            return res.status(400).json({
                success: false,
                message: 'Student fee ID, student ID, amount, and payment mode are required'
            });
        }

        const result = await Fee.recordPayment(req.body);

        res.json({
            success: true,
            message: 'Payment recorded successfully',
            data: result
        });

    } catch (error) {
        logger.error('Record payment error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to record payment',
            error: error.message
        });
    }
});

// Get payment history
router.get('/:id/payments', async (req, res) => {
    try {
        const payments = await Fee.getPaymentHistory(req.params.id);

        res.json({
            success: true,
            data: payments
        });

    } catch (error) {
        logger.error('Get payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment history',
            error: error.message
        });
    }
});

// Get receipt data
router.get('/receipt/:paymentId', async (req, res) => {
    try {
        const receipt = await Fee.getReceiptData(req.params.paymentId);

        if (!receipt) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            data: receipt
        });

    } catch (error) {
        logger.error('Get receipt error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch receipt',
            error: error.message
        });
    }
});

// Get revenue summary
router.get('/reports/revenue', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const revenue = await Fee.getRevenueSummary(startDate, endDate);

        res.json({
            success: true,
            data: revenue
        });

    } catch (error) {
        logger.error('Get revenue error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue summary',
            error: error.message
        });
    }
});

// Get collection by batch
router.get('/reports/collection-by-batch', async (req, res) => {
    try {
        const collection = await Fee.getCollectionByBatch();

        res.json({
            success: true,
            data: collection
        });

    } catch (error) {
        logger.error('Get collection error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collection summary',
            error: error.message
        });
    }
});

// Apply late fee
router.post('/:id/late-fee', async (req, res) => {
    try {
        const { amount } = req.body;

        if (!amount) {
            return res.status(400).json({
                success: false,
                message: 'Late fee amount is required'
            });
        }

        const fee = await Fee.applyLateFee(req.params.id, amount);

        res.json({
            success: true,
            message: 'Late fee applied successfully',
            data: fee
        });

    } catch (error) {
        logger.error('Apply late fee error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to apply late fee',
            error: error.message
        });
    }
});

// Update fee status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const fee = await Fee.updateStatus(req.params.id, status);

        res.json({
            success: true,
            message: 'Fee status updated successfully',
            data: fee
        });

    } catch (error) {
        logger.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update fee status',
            error: error.message
        });
    }
});

module.exports = router;
