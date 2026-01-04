const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../config/logger');

// Get dashboard overview
router.get('/overview', async (req, res) => {
    try {
        // Student stats
        const studentStats = await db.getOne(`
            SELECT 
                COUNT(*) as total_students,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_students,
                COUNT(CASE WHEN status = 'inquiry' THEN 1 END) as inquiries,
                COUNT(CASE WHEN status = 'enrolled' AND created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_admissions
            FROM students
        `);

        // Batch stats
        const batchStats = await db.getOne(`
            SELECT 
                COUNT(*) as total_batches,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_batches,
                SUM(current_strength) as total_enrolled
            FROM batches
        `);

        // Fee stats
        const feeStats = await db.getOne(`
            SELECT 
                COALESCE(SUM(net_amount), 0) as total_fee,
                COALESCE(SUM(paid_amount), 0) as collected,
                COALESCE(SUM(balance_amount), 0) as pending,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
            FROM student_fees
            WHERE academic_year = $1
        `, [process.env.CURRENT_SESSION || '2026-27']);

        // Today's attendance
        const attendanceStats = await db.getOne(`
            SELECT 
                COUNT(*) as marked,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
            FROM student_attendance
            WHERE attendance_date = CURRENT_DATE
        `);

        // Upcoming exams
        const upcomingExams = await db.getMany(`
            SELECT name, exam_date, exam_type
            FROM exams
            WHERE exam_date >= CURRENT_DATE AND status = 'scheduled'
            ORDER BY exam_date
            LIMIT 5
        `);

        res.json({
            success: true,
            data: {
                students: studentStats,
                batches: batchStats,
                fees: feeStats,
                attendance: attendanceStats,
                upcomingExams
            }
        });

    } catch (error) {
        logger.error('Dashboard overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard data',
            error: error.message
        });
    }
});

// Dashboard stats (compat endpoint for frontend/dashboard.html)
// Returns flattened keys used by the UI: totalStudents, monthlyRevenue, avgAttendance, pendingFees
router.get('/stats', async (req, res) => {
    try {
        const studentStats = await db.getOne(`SELECT COUNT(*)::int AS total_students FROM students`);

        // Use student_fees if present; fall back to 0 when tables aren't created yet
        let feeStats = { pending: 0, collected: 0 };
        try {
            const fees = await db.getOne(`
                SELECT
                    COALESCE(SUM(paid_amount), 0) as collected,
                    COALESCE(SUM(balance_amount), 0) as pending
                FROM student_fees
                WHERE academic_year = $1
            `, [process.env.CURRENT_SESSION || '2026-27']);
            feeStats = {
                collected: parseFloat(fees?.collected || 0),
                pending: parseFloat(fees?.pending || 0)
            };
        } catch (_) {
            // ignore if schema not present
        }

        // Attendance average (if view exists)
        let avgAttendance = 0;
        try {
            const att = await db.getOne(`SELECT COALESCE(AVG(attendance_percentage), 0) as avg FROM vw_attendance_summary`);
            avgAttendance = Math.round(parseFloat(att?.avg || 0));
        } catch (_) {
            // ignore if schema not present
        }

        res.json({
            totalStudents: studentStats?.total_students || 0,
            monthlyRevenue: feeStats.collected,
            avgAttendance,
            pendingFees: feeStats.pending
        });
    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get revenue analytics
router.get('/revenue', async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;

        const revenue = await db.getMany(`
            SELECT 
                DATE_TRUNC('month', payment_date) as month,
                SUM(amount) as total,
                COUNT(*) as transactions,
                SUM(CASE WHEN payment_mode = 'razorpay' THEN amount ELSE 0 END) as online,
                SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END) as cash
            FROM fee_payments
            WHERE status = 'success'
            AND payment_date >= CURRENT_DATE - INTERVAL '1 month' * $1
            GROUP BY DATE_TRUNC('month', payment_date)
            ORDER BY month DESC
        `, [months]);

        const totals = await db.getOne(`
            SELECT 
                SUM(amount) as total_collected,
                COUNT(DISTINCT student_id) as unique_payers
            FROM fee_payments
            WHERE status = 'success'
            AND payment_date >= DATE_TRUNC('month', CURRENT_DATE)
        `);

        res.json({
            success: true,
            data: {
                monthly: revenue,
                currentMonth: totals
            }
        });

    } catch (error) {
        logger.error('Revenue analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch revenue data',
            error: error.message
        });
    }
});

// Get batch performance
router.get('/performance', async (req, res) => {
    try {
        const performance = await db.getMany(`
            SELECT * FROM vw_batch_performance
            WHERE exam_date >= CURRENT_DATE - INTERVAL '90 days'
            ORDER BY exam_date DESC
        `);

        const topPerformers = await db.getMany(`
            SELECT 
                s.first_name || ' ' || s.last_name as student_name,
                s.enrollment_number,
                b.name as batch_name,
                AVG(r.percentage) as avg_percentage,
                COUNT(r.id) as exams_taken
            FROM students s
            JOIN student_batches sb ON s.id = sb.student_id
            JOIN batches b ON sb.batch_id = b.id
            JOIN results r ON s.id = r.student_id
            WHERE r.is_absent = false
            GROUP BY s.id, s.first_name, s.last_name, s.enrollment_number, b.name
            HAVING COUNT(r.id) >= 3
            ORDER BY AVG(r.percentage) DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                batchPerformance: performance,
                topPerformers
            }
        });

    } catch (error) {
        logger.error('Performance analytics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance data',
            error: error.message
        });
    }
});

// Get risk indicators (dropouts, low attendance, fee defaulters)
router.get('/risks', async (req, res) => {
    try {
        // Low attendance
        const lowAttendance = await db.getMany(`
            SELECT * FROM vw_attendance_summary
            WHERE attendance_percentage < 75
            ORDER BY attendance_percentage ASC
            LIMIT 20
        `);

        // Fee defaulters
        const feeDefaulters = await db.getMany(`
            SELECT 
                s.first_name || ' ' || s.last_name as student_name,
                s.phone,
                b.name as batch_name,
                sf.balance_amount,
                CURRENT_DATE - sf.due_date as days_overdue
            FROM student_fees sf
            JOIN students s ON sf.student_id = s.id
            LEFT JOIN batches b ON sf.batch_id = b.id
            WHERE sf.status IN ('pending', 'partial', 'overdue')
            AND sf.due_date < CURRENT_DATE
            ORDER BY days_overdue DESC
            LIMIT 20
        `);

        // Inactive students (no attendance in 2 weeks)
        const inactiveStudents = await db.getMany(`
            SELECT 
                s.first_name || ' ' || s.last_name as student_name,
                s.phone,
                s.father_phone,
                MAX(sa.attendance_date) as last_attendance
            FROM students s
            LEFT JOIN student_attendance sa ON s.id = sa.student_id
            WHERE s.status = 'active'
            GROUP BY s.id, s.first_name, s.last_name, s.phone, s.father_phone
            HAVING MAX(sa.attendance_date) < CURRENT_DATE - INTERVAL '14 days'
            OR MAX(sa.attendance_date) IS NULL
            ORDER BY last_attendance NULLS FIRST
            LIMIT 20
        `);

        res.json({
            success: true,
            data: {
                lowAttendance,
                feeDefaulters,
                inactiveStudents
            }
        });

    } catch (error) {
        logger.error('Risk indicators error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch risk indicators',
            error: error.message
        });
    }
});

// Get admission funnel
router.get('/admissions', async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;

        const funnel = await db.getOne(`
            SELECT 
                COUNT(*) as total_inquiries,
                COUNT(CASE WHEN status = 'contacted' THEN 1 END) as contacted,
                COUNT(CASE WHEN status = 'follow_up' THEN 1 END) as follow_up,
                COUNT(CASE WHEN status = 'demo_scheduled' THEN 1 END) as demo_scheduled,
                COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted,
                COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost
            FROM inquiries
            WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
        `, [days]);

        const sourceBreakdown = await db.getMany(`
            SELECT 
                source,
                COUNT(*) as count,
                COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted
            FROM inquiries
            WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
            GROUP BY source
            ORDER BY count DESC
        `, [days]);

        const dailyTrend = await db.getMany(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as inquiries,
                COUNT(CASE WHEN status = 'converted' THEN 1 END) as conversions
            FROM inquiries
            WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1
            GROUP BY DATE(created_at)
            ORDER BY date
        `, [days]);

        res.json({
            success: true,
            data: {
                funnel,
                sourceBreakdown,
                dailyTrend
            }
        });

    } catch (error) {
        logger.error('Admission funnel error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch admission data',
            error: error.message
        });
    }
});

// Get faculty efficiency
router.get('/faculty', async (req, res) => {
    try {
        const facultyStats = await db.getMany(`
            SELECT 
                f.id,
                f.first_name || ' ' || f.last_name as faculty_name,
                f.designation,
                COUNT(DISTINCT fb.batch_id) as batches_assigned,
                COUNT(DISTINCT fa.attendance_date) FILTER (WHERE fa.status = 'present') as days_present,
                COUNT(DISTINCT fa.attendance_date) as total_days,
                COALESCE(AVG(sp.hours_spent), 0) as avg_hours_per_topic
            FROM faculty f
            LEFT JOIN faculty_batches fb ON f.id = fb.faculty_id
            LEFT JOIN faculty_attendance fa ON f.id = fa.faculty_id 
                AND fa.attendance_date >= CURRENT_DATE - INTERVAL '30 days'
            LEFT JOIN syllabus_progress sp ON f.id = sp.faculty_id
            WHERE f.is_active = true
            GROUP BY f.id, f.first_name, f.last_name, f.designation
            ORDER BY batches_assigned DESC
        `);

        res.json({
            success: true,
            data: facultyStats
        });

    } catch (error) {
        logger.error('Faculty efficiency error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty data',
            error: error.message
        });
    }
});

// Get daily summary
router.get('/daily-summary', async (req, res) => {
    try {
        const date = req.query.date || new Date().toISOString().split('T')[0];

        const summary = {
            date,
            attendance: await db.getOne(`
                SELECT 
                    COUNT(DISTINCT student_id) as students_marked,
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
                FROM student_attendance WHERE attendance_date = $1
            `, [date]),
            
            collections: await db.getOne(`
                SELECT 
                    COUNT(*) as transactions,
                    COALESCE(SUM(amount), 0) as total_collected
                FROM fee_payments 
                WHERE payment_date = $1 AND status = 'success'
            `, [date]),

            newInquiries: await db.getOne(`
                SELECT COUNT(*) as count
                FROM inquiries WHERE DATE(created_at) = $1
            `, [date]),

            examsToday: await db.getMany(`
                SELECT name, exam_type, start_time
                FROM exams WHERE exam_date = $1
            `, [date])
        };

        res.json({
            success: true,
            data: summary
        });

    } catch (error) {
        logger.error('Daily summary error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch daily summary',
            error: error.message
        });
    }
});

module.exports = router;
