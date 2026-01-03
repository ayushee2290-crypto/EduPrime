const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const logger = require('../config/logger');

// Mark student attendance
router.post('/mark', async (req, res) => {
    try {
        const { student_id, batch_id, attendance_date, status } = req.body;

        if (!student_id || !batch_id || !attendance_date || !status) {
            return res.status(400).json({
                success: false,
                message: 'Student ID, batch ID, date, and status are required'
            });
        }

        const attendance = await Attendance.markStudent(req.body);

        res.json({
            success: true,
            message: 'Attendance marked successfully',
            data: attendance
        });

    } catch (error) {
        logger.error('Mark attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark attendance',
            error: error.message
        });
    }
});

// Mark bulk attendance
router.post('/mark-bulk', async (req, res) => {
    try {
        const { attendance_list } = req.body;

        if (!attendance_list || !Array.isArray(attendance_list)) {
            return res.status(400).json({
                success: false,
                message: 'Attendance list array is required'
            });
        }

        const results = await Attendance.markBulk(attendance_list);

        res.json({
            success: true,
            message: `Attendance marked for ${results.length} students`,
            data: results
        });

    } catch (error) {
        logger.error('Mark bulk attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark bulk attendance',
            error: error.message
        });
    }
});

// Mark faculty attendance
router.post('/faculty', async (req, res) => {
    try {
        const { faculty_id, attendance_date, status } = req.body;

        if (!faculty_id || !attendance_date || !status) {
            return res.status(400).json({
                success: false,
                message: 'Faculty ID, date, and status are required'
            });
        }

        const attendance = await Attendance.markFaculty(req.body);

        res.json({
            success: true,
            message: 'Faculty attendance marked successfully',
            data: attendance
        });

    } catch (error) {
        logger.error('Mark faculty attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark faculty attendance',
            error: error.message
        });
    }
});

// Get attendance by date/batch
router.get('/', async (req, res) => {
    try {
        const filters = {
            date: req.query.date,
            batch_id: req.query.batch_id,
            student_id: req.query.student_id,
            status: req.query.status
        };

        const attendance = await Attendance.getStudentAttendance(filters);

        res.json({
            success: true,
            count: attendance.length,
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

// Get batch attendance summary for a date
router.get('/batch/:batchId/summary', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];
        const summary = await Attendance.getBatchSummary(req.params.batchId, date);

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        logger.error('Get batch summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch batch summary',
            error: error.message
        });
    }
});

// Get student attendance summary
router.get('/student/:studentId/summary', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const summary = await Attendance.getStudentSummary(req.params.studentId, startDate, endDate);

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        logger.error('Get student summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student summary',
            error: error.message
        });
    }
});

// Get low attendance students
router.get('/alerts/low-attendance', async (req, res) => {
    try {
        const threshold = req.query.threshold ? parseInt(req.query.threshold) : 75;
        const students = await Attendance.getLowAttendance(threshold, req.query.batch_id);

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

// Get today's absentees
router.get('/alerts/absentees', async (req, res) => {
    try {
        const absentees = await Attendance.getTodayAbsentees(req.query.batch_id);

        res.json({
            success: true,
            count: absentees.length,
            data: absentees
        });

    } catch (error) {
        logger.error('Get absentees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch absentees',
            error: error.message
        });
    }
});

// Get consecutive absences
router.get('/alerts/consecutive', async (req, res) => {
    try {
        const days = req.query.days ? parseInt(req.query.days) : 3;
        const students = await Attendance.getConsecutiveAbsences(days);

        res.json({
            success: true,
            count: students.length,
            data: students
        });

    } catch (error) {
        logger.error('Get consecutive absences error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch consecutive absences',
            error: error.message
        });
    }
});

// Get faculty attendance
router.get('/faculty/:facultyId', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const attendance = await Attendance.getFacultyAttendance(req.params.facultyId, startDate, endDate);

        res.json({
            success: true,
            data: attendance
        });

    } catch (error) {
        logger.error('Get faculty attendance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty attendance',
            error: error.message
        });
    }
});

// Get attendance report
router.get('/report', async (req, res) => {
    try {
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const report = await Attendance.getAttendanceReport(startDate, endDate, req.query.batch_id);

        res.json({
            success: true,
            data: report
        });

    } catch (error) {
        logger.error('Get report error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch attendance report',
            error: error.message
        });
    }
});

module.exports = router;
