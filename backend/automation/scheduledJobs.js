const cron = require('node-cron');
const logger = require('../config/logger');
const feeReminderService = require('../services/feeReminderService');
const attendanceAlertService = require('../services/attendanceAlertService');
const db = require('../config/database');

// Initialize all scheduled jobs
function initializeScheduledJobs() {
    logger.info('Initializing scheduled jobs...');

    // Fee reminders - Daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
        logger.info('Running daily fee reminders...');
        try {
            await feeReminderService.sendReminders();
        } catch (error) {
            logger.error('Fee reminder job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Overdue fee notifications - Daily at 10 AM
    cron.schedule('0 10 * * *', async () => {
        logger.info('Running overdue fee notifications...');
        try {
            await feeReminderService.sendOverdueNotifications();
        } catch (error) {
            logger.error('Overdue notification job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Attendance alerts - Daily at 7 PM
    cron.schedule('0 19 * * *', async () => {
        logger.info('Running attendance alerts...');
        try {
            await attendanceAlertService.sendAbsenceAlerts();
        } catch (error) {
            logger.error('Attendance alert job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Low attendance warnings - Every Monday at 10 AM
    cron.schedule('0 10 * * 1', async () => {
        logger.info('Running low attendance warnings...');
        try {
            await attendanceAlertService.sendLowAttendanceWarnings();
        } catch (error) {
            logger.error('Low attendance warning job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Consecutive absence alerts - Daily at 6 PM
    cron.schedule('0 18 * * *', async () => {
        logger.info('Running consecutive absence alerts...');
        try {
            await attendanceAlertService.sendConsecutiveAbsenceAlerts();
        } catch (error) {
            logger.error('Consecutive absence alert job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Daily summary report - Daily at 8 PM
    cron.schedule('0 20 * * *', async () => {
        logger.info('Generating daily summary report...');
        try {
            await generateDailySummary();
        } catch (error) {
            logger.error('Daily summary job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Weekly report - Every Sunday at 6 PM
    cron.schedule('0 18 * * 0', async () => {
        logger.info('Generating weekly report...');
        try {
            await generateWeeklyReport();
        } catch (error) {
            logger.error('Weekly report job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Monthly revenue report - 1st of every month at 9 AM
    cron.schedule('0 9 1 * *', async () => {
        logger.info('Generating monthly revenue report...');
        try {
            await generateMonthlyReport();
        } catch (error) {
            logger.error('Monthly report job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    // Inquiry follow-up reminders - Daily at 9:30 AM
    cron.schedule('30 9 * * *', async () => {
        logger.info('Sending inquiry follow-up reminders...');
        try {
            await sendFollowUpReminders();
        } catch (error) {
            logger.error('Follow-up reminder job failed:', error);
        }
    }, {
        timezone: 'Asia/Kolkata'
    });

    logger.info('All scheduled jobs initialized successfully');
}

// Generate daily summary
async function generateDailySummary() {
    const today = new Date().toISOString().split('T')[0];
    
    const summary = {
        date: today,
        attendance: await db.getOne(`
            SELECT 
                COUNT(DISTINCT student_id) as students_marked,
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
            FROM student_attendance WHERE attendance_date = $1
        `, [today]),
        
        collections: await db.getOne(`
            SELECT 
                COUNT(*) as transactions,
                COALESCE(SUM(amount), 0) as total_collected
            FROM fee_payments 
            WHERE payment_date = $1 AND status = 'success'
        `, [today]),

        newInquiries: await db.getOne(`
            SELECT COUNT(*) as count FROM inquiries WHERE DATE(created_at) = $1
        `, [today]),

        newEnrollments: await db.getOne(`
            SELECT COUNT(*) as count FROM students 
            WHERE enrollment_date = $1
        `, [today])
    };

    logger.info('Daily Summary:', summary);
    
    // Send to admin via WhatsApp/Email
    const notificationService = require('../services/notificationService');
    const adminPhone = process.env.INSTITUTE_PHONE;
    
    if (adminPhone) {
        const message = `📊 EduPrime Daily Summary - ${today}\n\n` +
            `👥 Attendance: ${summary.attendance?.present || 0}/${summary.attendance?.students_marked || 0} present\n` +
            `💰 Collections: ₹${summary.collections?.total_collected || 0} (${summary.collections?.transactions || 0} txns)\n` +
            `📝 New Inquiries: ${summary.newInquiries?.count || 0}\n` +
            `🎓 New Enrollments: ${summary.newEnrollments?.count || 0}`;
        
        try {
            await notificationService.send({
                channel: 'whatsapp',
                recipient_phone: adminPhone,
                body: message,
                reference_type: 'daily_summary'
            });
        } catch (error) {
            logger.error('Failed to send daily summary:', error);
        }
    }

    return summary;
}

// Generate weekly report
async function generateWeeklyReport() {
    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    const report = {
        period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        
        revenue: await db.getOne(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_collected,
                COUNT(*) as transactions
            FROM fee_payments 
            WHERE payment_date BETWEEN $1 AND $2 AND status = 'success'
        `, [startDate, endDate]),

        attendance: await db.getOne(`
            SELECT 
                ROUND(AVG(CASE WHEN status = 'present' THEN 100.0 ELSE 0 END), 2) as avg_attendance
            FROM student_attendance 
            WHERE attendance_date BETWEEN $1 AND $2
        `, [startDate, endDate]),

        newInquiries: await db.getOne(`
            SELECT COUNT(*) as count FROM inquiries 
            WHERE created_at BETWEEN $1 AND $2
        `, [startDate, endDate]),

        conversions: await db.getOne(`
            SELECT COUNT(*) as count FROM inquiries 
            WHERE conversion_date BETWEEN $1 AND $2
        `, [startDate, endDate])
    };

    logger.info('Weekly Report:', report);
    return report;
}

// Generate monthly report
async function generateMonthlyReport() {
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
    const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth(), 0);

    const report = {
        month: startDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        
        revenue: await db.getOne(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_collected,
                COUNT(DISTINCT student_id) as unique_payers
            FROM fee_payments 
            WHERE payment_date BETWEEN $1 AND $2 AND status = 'success'
        `, [startDate, monthEnd]),

        outstanding: await db.getOne(`
            SELECT 
                COALESCE(SUM(balance_amount), 0) as total_pending,
                COUNT(*) as pending_count
            FROM student_fees 
            WHERE status IN ('pending', 'partial', 'overdue')
        `),

        admissions: await db.getOne(`
            SELECT 
                COUNT(*) as new_enrollments,
                COUNT(CASE WHEN status = 'dropped' THEN 1 END) as dropouts
            FROM students 
            WHERE enrollment_date BETWEEN $1 AND $2
        `, [startDate, monthEnd])
    };

    logger.info('Monthly Report:', report);
    return report;
}

// Send follow-up reminders to counselors
async function sendFollowUpReminders() {
    const followUps = await db.getMany(`
        SELECT i.*, u.email as counselor_email, u.phone as counselor_phone
        FROM inquiries i
        LEFT JOIN users u ON i.assigned_counselor_id = u.id
        WHERE i.next_follow_up_date <= CURRENT_DATE
        AND i.status NOT IN ('converted', 'lost')
    `);

    if (followUps.length > 0) {
        logger.info(`${followUps.length} follow-ups due today`);
        
        // Group by counselor and send summary
        const byCounselor = {};
        for (const followUp of followUps) {
            const counselor = followUp.counselor_email || 'admin';
            if (!byCounselor[counselor]) {
                byCounselor[counselor] = [];
            }
            byCounselor[counselor].push(followUp);
        }

        // Send notifications (implement as needed)
    }

    return followUps.length;
}

module.exports = { initializeScheduledJobs };
