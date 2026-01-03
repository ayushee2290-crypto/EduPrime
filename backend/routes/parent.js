const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const db = require('../config/database');
const logger = require('../config/logger');
const { authenticateToken } = require('./auth');

// ===========================================
// PARENT PORTAL - View child's information
// ===========================================

// Get parent's children
router.get('/my-children', authenticateToken, async (req, res) => {
    try {
        const children = await db.getMany(`
            SELECT 
                s.id,
                s.first_name || ' ' || s.last_name as name,
                s.photo_url,
                s.current_class,
                s.target_exam,
                b.name as batch_name,
                c.name as course_name
            FROM students s
            JOIN parent_student ps ON ps.student_id = s.id
            JOIN users u ON u.phone = ps.parent_phone OR u.email = ps.parent_email
            LEFT JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
            LEFT JOIN batches b ON b.id = sb.batch_id
            LEFT JOIN courses c ON c.id = b.course_id
            WHERE u.id = $1
        `, [req.user.id]);

        // If no linked records, try matching by phone
        if (children.length === 0) {
            const user = await db.getOne('SELECT phone FROM users WHERE id = $1', [req.user.id]);
            if (user) {
                const childrenByPhone = await db.getMany(`
                    SELECT 
                        s.id,
                        s.first_name || ' ' || s.last_name as name,
                        s.photo_url,
                        s.current_class,
                        s.target_exam,
                        b.name as batch_name,
                        c.name as course_name
                    FROM students s
                    LEFT JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
                    LEFT JOIN batches b ON b.id = sb.batch_id
                    LEFT JOIN courses c ON c.id = b.course_id
                    WHERE s.father_phone = $1 OR s.mother_phone = $1 OR s.guardian_phone = $1
                `, [user.phone]);
                return res.json({ success: true, data: childrenByPhone });
            }
        }

        res.json({ success: true, data: children });
    } catch (error) {
        logger.error('Error fetching children:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch children' });
    }
});

// Get child's dashboard summary
router.get('/child/:studentId/dashboard', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        // Verify parent has access to this student
        const hasAccess = await verifyParentAccess(req.user.id, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Student info
        const student = await db.getOne(`
            SELECT s.*, 
                b.name as batch_name,
                c.name as course_name,
                f.first_name || ' ' || f.last_name as class_teacher
            FROM students s
            LEFT JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
            LEFT JOIN batches b ON b.id = sb.batch_id
            LEFT JOIN courses c ON c.id = b.course_id
            LEFT JOIN faculty f ON f.id = b.faculty_id
            WHERE s.id = $1
        `, [studentId]);

        // Recent attendance (last 30 days)
        const attendance = await db.getOne(`
            SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(*) as total,
                ROUND(
                    COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(*), 0), 2
                ) as percentage
            FROM attendance
            WHERE student_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
        `, [studentId]);

        // Recent exam results
        const recentExams = await db.getMany(`
            SELECT 
                e.exam_name,
                e.subject,
                e.exam_date,
                er.marks_obtained,
                er.total_marks,
                er.percentage,
                er.rank,
                er.grade
            FROM exam_results er
            JOIN exams e ON e.id = er.exam_id
            WHERE er.student_id = $1
            ORDER BY e.exam_date DESC
            LIMIT 5
        `, [studentId]);

        // Fee status
        const feeStatus = await db.getOne(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_fees,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid,
                COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END), 0) as pending
            FROM fees
            WHERE student_id = $1
        `, [studentId]);

        // Upcoming exams
        const upcomingExams = await db.getMany(`
            SELECT e.exam_name, e.subject, e.exam_date, e.total_marks
            FROM exams e
            JOIN batches b ON b.id = e.batch_id
            JOIN student_batches sb ON sb.batch_id = b.id AND sb.status = 'active'
            WHERE sb.student_id = $1 AND e.exam_date >= CURRENT_DATE
            ORDER BY e.exam_date
            LIMIT 5
        `, [studentId]);

        res.json({
            success: true,
            data: {
                student,
                attendance_summary: attendance,
                recent_exams: recentExams,
                fee_status: feeStatus,
                upcoming_exams: upcomingExams
            }
        });
    } catch (error) {
        logger.error('Error fetching child dashboard:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
    }
});

// Get child's attendance details
router.get('/child/:studentId/attendance', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const { month, year } = req.query;

        const hasAccess = await verifyParentAccess(req.user.id, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Default to current month
        const targetMonth = month || new Date().getMonth() + 1;
        const targetYear = year || new Date().getFullYear();

        const attendance = await db.getMany(`
            SELECT 
                a.date,
                a.status,
                a.remarks,
                b.name as batch_name
            FROM attendance a
            JOIN batches b ON b.id = a.batch_id
            WHERE a.student_id = $1
            AND EXTRACT(MONTH FROM a.date) = $2
            AND EXTRACT(YEAR FROM a.date) = $3
            ORDER BY a.date
        `, [studentId, targetMonth, targetYear]);

        // Monthly summary
        const summary = await db.getOne(`
            SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                COUNT(CASE WHEN status = 'leave' THEN 1 END) as leave,
                COUNT(*) as total
            FROM attendance
            WHERE student_id = $1
            AND EXTRACT(MONTH FROM date) = $2
            AND EXTRACT(YEAR FROM date) = $3
        `, [studentId, targetMonth, targetYear]);

        res.json({
            success: true,
            data: {
                month: targetMonth,
                year: targetYear,
                attendance,
                summary
            }
        });
    } catch (error) {
        logger.error('Error fetching child attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }
});

// Get child's exam results
router.get('/child/:studentId/results', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const { subject, exam_type, limit } = req.query;

        const hasAccess = await verifyParentAccess(req.user.id, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        let query = `
            SELECT 
                e.id as exam_id,
                e.exam_name,
                e.exam_type,
                e.subject,
                e.exam_date,
                er.marks_obtained,
                er.total_marks,
                er.percentage,
                er.rank,
                er.grade,
                er.remarks
            FROM exam_results er
            JOIN exams e ON e.id = er.exam_id
            WHERE er.student_id = $1
        `;
        const params = [studentId];
        let paramIndex = 2;

        if (subject) {
            query += ` AND e.subject = $${paramIndex++}`;
            params.push(subject);
        }
        if (exam_type) {
            query += ` AND e.exam_type = $${paramIndex++}`;
            params.push(exam_type);
        }

        query += ` ORDER BY e.exam_date DESC`;

        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit));
        }

        const results = await db.query(query, params);

        // Subject-wise summary
        const subjectSummary = await db.getMany(`
            SELECT 
                e.subject,
                COUNT(*) as exams_taken,
                ROUND(AVG(er.percentage), 2) as avg_percentage,
                MAX(er.percentage) as best_score,
                MIN(er.percentage) as lowest_score
            FROM exam_results er
            JOIN exams e ON e.id = er.exam_id
            WHERE er.student_id = $1
            GROUP BY e.subject
            ORDER BY avg_percentage DESC
        `, [studentId]);

        res.json({
            success: true,
            data: {
                results: results.rows,
                subject_summary: subjectSummary
            }
        });
    } catch (error) {
        logger.error('Error fetching child results:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch results' });
    }
});

// Get child's fee details
router.get('/child/:studentId/fees', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        const hasAccess = await verifyParentAccess(req.user.id, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Fee records
        const fees = await db.getMany(`
            SELECT 
                f.*,
                c.name as course_name
            FROM fees f
            LEFT JOIN courses c ON c.id = f.course_id
            WHERE f.student_id = $1
            ORDER BY f.due_date DESC
        `, [studentId]);

        // Summary
        const summary = await db.getOne(`
            SELECT 
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
                COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
                COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as overdue_amount,
                COALESCE(SUM(discount_amount), 0) as total_discount
            FROM fees
            WHERE student_id = $1
        `, [studentId]);

        // Payment history
        const payments = await db.getMany(`
            SELECT 
                fp.*,
                f.fee_type
            FROM fee_payments fp
            JOIN fees f ON f.id = fp.fee_id
            WHERE f.student_id = $1
            ORDER BY fp.payment_date DESC
            LIMIT 20
        `, [studentId]);

        res.json({
            success: true,
            data: {
                fees,
                summary,
                payment_history: payments
            }
        });
    } catch (error) {
        logger.error('Error fetching child fees:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch fees' });
    }
});

// Get child's progress report
router.get('/child/:studentId/progress-report', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const { start_date, end_date } = req.query;

        const hasAccess = await verifyParentAccess(req.user.id, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const endDate = end_date || new Date().toISOString().split('T')[0];
        const startDate = start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const report = await Performance.generateProgressReport(studentId, startDate, endDate);
        res.json({ success: true, data: report });
    } catch (error) {
        logger.error('Error generating progress report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

// Get batch schedule/timetable for child
router.get('/child/:studentId/schedule', authenticateToken, async (req, res) => {
    try {
        const studentId = req.params.studentId;

        const hasAccess = await verifyParentAccess(req.user.id, studentId);
        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const schedule = await db.getMany(`
            SELECT 
                b.name as batch_name,
                b.start_time,
                b.end_time,
                b.days_of_week,
                b.room_number,
                c.name as course_name,
                f.first_name || ' ' || f.last_name as faculty_name,
                s.name as subject_name
            FROM student_batches sb
            JOIN batches b ON b.id = sb.batch_id
            JOIN courses c ON c.id = b.course_id
            LEFT JOIN faculty f ON f.id = b.faculty_id
            LEFT JOIN subjects s ON s.id = b.subject_id
            WHERE sb.student_id = $1 AND sb.status = 'active'
            ORDER BY b.start_time
        `, [studentId]);

        res.json({ success: true, data: schedule });
    } catch (error) {
        logger.error('Error fetching schedule:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
    }
});

// Get notifications for parent
router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await db.getMany(`
            SELECT n.*
            FROM notifications n
            WHERE n.recipient_id = $1 
            OR n.recipient_type = 'all_parents'
            ORDER BY n.created_at DESC
            LIMIT 50
        `, [req.user.id]);

        res.json({ success: true, data: notifications });
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});

// Submit feedback/query
router.post('/feedback', authenticateToken, async (req, res) => {
    try {
        const { student_id, subject, message, category } = req.body;

        const feedback = await db.insert(`
            INSERT INTO parent_feedback (
                parent_user_id, student_id, subject, message, category, status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
        `, [req.user.id, student_id, subject, message, category || 'general']);

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: feedback
        });
    } catch (error) {
        logger.error('Error submitting feedback:', error);
        res.status(500).json({ success: false, message: 'Failed to submit feedback' });
    }
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function verifyParentAccess(userId, studentId) {
    try {
        // Check direct link
        const directLink = await db.getOne(`
            SELECT 1 FROM parent_student ps
            JOIN users u ON u.phone = ps.parent_phone OR u.email = ps.parent_email
            WHERE u.id = $1 AND ps.student_id = $2
        `, [userId, studentId]);

        if (directLink) return true;

        // Check by phone match
        const user = await db.getOne('SELECT phone FROM users WHERE id = $1', [userId]);
        if (user) {
            const phoneMatch = await db.getOne(`
                SELECT 1 FROM students
                WHERE id = $1 AND (father_phone = $2 OR mother_phone = $2 OR guardian_phone = $2)
            `, [studentId, user.phone]);
            if (phoneMatch) return true;
        }

        // Check if admin or manager (full access)
        const adminAccess = await db.getOne(`
            SELECT 1 FROM users WHERE id = $1 AND role IN ('admin', 'manager')
        `, [userId]);

        return !!adminAccess;
    } catch (error) {
        logger.error('Error verifying parent access:', error);
        return false;
    }
}

module.exports = router;
