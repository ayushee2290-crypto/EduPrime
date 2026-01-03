const express = require('express');
const router = express.Router();
const Performance = require('../models/Performance');
const db = require('../config/database');
const logger = require('../config/logger');
const { authenticateToken, authorizeRoles } = require('./auth');

// ===========================================
// STUDENT PERFORMANCE
// ===========================================

// Get student's own performance (for student login)
router.get('/my-performance', authenticateToken, async (req, res) => {
    try {
        // Get student ID from user
        const student = await db.getOne(`
            SELECT s.id FROM students s
            JOIN users u ON u.id = s.user_id
            WHERE u.id = $1
        `, [req.user.id]);

        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found' });
        }

        const performance = await Performance.getStudentSummary(student.id);
        res.json({ success: true, data: performance });
    } catch (error) {
        logger.error('Error fetching my performance:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch performance' });
    }
});

// Get any student's performance (for admin/faculty/parent)
router.get('/students/:id/performance', authenticateToken, async (req, res) => {
    try {
        const performance = await Performance.getStudentSummary(req.params.id);
        if (!performance) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        res.json({ success: true, data: performance });
    } catch (error) {
        logger.error('Error fetching student performance:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch performance' });
    }
});

// Get performance trend
router.get('/students/:id/performance/trend', authenticateToken, async (req, res) => {
    try {
        const months = parseInt(req.query.months) || 6;
        const trend = await Performance.getPerformanceTrend(req.params.id, months);
        res.json({ success: true, data: trend });
    } catch (error) {
        logger.error('Error fetching performance trend:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch trend' });
    }
});

// Generate progress report
router.get('/students/:id/progress-report', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        // Default to last 3 months if not specified
        const endDate = end_date || new Date().toISOString().split('T')[0];
        const startDate = start_date || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const report = await Performance.generateProgressReport(req.params.id, startDate, endDate);
        res.json({ success: true, data: report });
    } catch (error) {
        logger.error('Error generating progress report:', error);
        res.status(500).json({ success: false, message: 'Failed to generate report' });
    }
});

// ===========================================
// BATCH RANKINGS
// ===========================================

// Get batch rankings
router.get('/batches/:id/rankings', authenticateToken, async (req, res) => {
    try {
        const { exam_id } = req.query;
        const rankings = await Performance.getBatchRankings(req.params.id, exam_id);
        res.json({ success: true, data: rankings });
    } catch (error) {
        logger.error('Error fetching batch rankings:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rankings' });
    }
});

// Get batch performance summary
router.get('/batches/:id/performance-summary', authenticateToken, async (req, res) => {
    try {
        const batchId = req.params.id;

        // Overall stats
        const stats = await db.getOne(`
            SELECT 
                COUNT(DISTINCT er.student_id) as students_with_results,
                ROUND(AVG(er.percentage), 2) as avg_percentage,
                MAX(er.percentage) as highest_score,
                MIN(er.percentage) as lowest_score
            FROM exam_results er
            JOIN student_batches sb ON sb.student_id = er.student_id AND sb.status = 'active'
            WHERE sb.batch_id = $1
        `, [batchId]);

        // Subject-wise performance
        const subjectWise = await db.getMany(`
            SELECT 
                e.subject,
                COUNT(DISTINCT er.student_id) as students,
                ROUND(AVG(er.percentage), 2) as avg_score,
                MAX(er.percentage) as top_score
            FROM exam_results er
            JOIN exams e ON e.id = er.exam_id
            JOIN student_batches sb ON sb.student_id = er.student_id AND sb.status = 'active'
            WHERE sb.batch_id = $1
            GROUP BY e.subject
            ORDER BY avg_score DESC
        `, [batchId]);

        // Recent exams
        const recentExams = await db.getMany(`
            SELECT 
                e.*,
                COUNT(er.id) as students_appeared,
                ROUND(AVG(er.percentage), 2) as avg_score
            FROM exams e
            LEFT JOIN exam_results er ON er.exam_id = e.id
            WHERE e.batch_id = $1
            GROUP BY e.id
            ORDER BY e.exam_date DESC
            LIMIT 10
        `, [batchId]);

        res.json({
            success: true,
            data: {
                overall_stats: stats,
                subject_wise: subjectWise,
                recent_exams: recentExams
            }
        });
    } catch (error) {
        logger.error('Error fetching batch performance summary:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch summary' });
    }
});

// ===========================================
// EXAM MANAGEMENT
// ===========================================

// Get all exams with filters
router.get('/exams', authenticateToken, async (req, res) => {
    try {
        const { batch_id, subject, exam_type, start_date, end_date } = req.query;

        let query = `
            SELECT e.*, 
                b.name as batch_name,
                COUNT(er.id) as results_count,
                ROUND(AVG(er.percentage), 2) as avg_score
            FROM exams e
            JOIN batches b ON b.id = e.batch_id
            LEFT JOIN exam_results er ON er.exam_id = e.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (batch_id) {
            query += ` AND e.batch_id = $${paramIndex++}`;
            params.push(batch_id);
        }
        if (subject) {
            query += ` AND e.subject = $${paramIndex++}`;
            params.push(subject);
        }
        if (exam_type) {
            query += ` AND e.exam_type = $${paramIndex++}`;
            params.push(exam_type);
        }
        if (start_date) {
            query += ` AND e.exam_date >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND e.exam_date <= $${paramIndex++}`;
            params.push(end_date);
        }

        query += ` GROUP BY e.id, b.name ORDER BY e.exam_date DESC`;

        const exams = await db.query(query, params);
        res.json({ success: true, data: exams.rows });
    } catch (error) {
        logger.error('Error fetching exams:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch exams' });
    }
});

// Get exam results
router.get('/exams/:id/results', authenticateToken, async (req, res) => {
    try {
        const results = await Performance.getExamResults(req.params.id);
        res.json({ success: true, data: results });
    } catch (error) {
        logger.error('Error fetching exam results:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch results' });
    }
});

// Create exam
router.post('/exams', authenticateToken, authorizeRoles('admin', 'manager', 'faculty'), async (req, res) => {
    try {
        const {
            batch_id, exam_name, exam_type, subject, exam_date,
            total_marks, passing_marks, duration_minutes, syllabus_covered
        } = req.body;

        const exam = await db.insert(`
            INSERT INTO exams (
                batch_id, exam_name, exam_type, subject, exam_date,
                total_marks, passing_marks, duration_minutes, syllabus_covered
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [batch_id, exam_name, exam_type, subject, exam_date,
            total_marks, passing_marks || total_marks * 0.33, duration_minutes, syllabus_covered]);

        res.status(201).json({
            success: true,
            message: 'Exam created successfully',
            data: exam
        });
    } catch (error) {
        logger.error('Error creating exam:', error);
        res.status(500).json({ success: false, message: 'Failed to create exam' });
    }
});

// Record single exam result
router.post('/exams/:id/results', authenticateToken, authorizeRoles('admin', 'manager', 'faculty'), async (req, res) => {
    try {
        const { student_id, marks_obtained, total_marks, remarks } = req.body;

        const result = await Performance.recordResult({
            exam_id: req.params.id,
            student_id,
            marks_obtained,
            total_marks,
            remarks
        });

        res.json({
            success: true,
            message: 'Result recorded successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error recording result:', error);
        res.status(500).json({ success: false, message: 'Failed to record result' });
    }
});

// Bulk record exam results
router.post('/exams/:id/results/bulk', authenticateToken, authorizeRoles('admin', 'manager', 'faculty'), async (req, res) => {
    try {
        const { results } = req.body; // Array of { student_id, marks_obtained, total_marks, remarks }

        const recorded = await Performance.bulkRecordResults(req.params.id, results);

        res.json({
            success: true,
            message: `${recorded.length} results recorded successfully`,
            data: recorded
        });
    } catch (error) {
        logger.error('Error bulk recording results:', error);
        res.status(500).json({ success: false, message: 'Failed to record results' });
    }
});

// ===========================================
// ATTENDANCE TRACKING
// ===========================================

// Get attendance for a batch on a date
router.get('/attendance/batch/:batchId', authenticateToken, async (req, res) => {
    try {
        const { date, start_date, end_date } = req.query;
        const batchId = req.params.batchId;

        let query, params;

        if (date) {
            // Single date
            query = `
                SELECT 
                    s.id as student_id,
                    s.first_name || ' ' || s.last_name as student_name,
                    s.photo_url,
                    COALESCE(a.status, 'not_marked') as status,
                    a.remarks
                FROM students s
                JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
                LEFT JOIN attendance a ON a.student_id = s.id AND a.batch_id = $1 AND a.date = $2
                WHERE sb.batch_id = $1
                ORDER BY s.first_name
            `;
            params = [batchId, date];
        } else {
            // Date range
            query = `
                SELECT 
                    s.id as student_id,
                    s.first_name || ' ' || s.last_name as student_name,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_days,
                    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_days,
                    COUNT(a.id) as total_days,
                    ROUND(
                        COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(a.id), 0), 2
                    ) as attendance_percent
                FROM students s
                JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
                LEFT JOIN attendance a ON a.student_id = s.id AND a.batch_id = $1
                    AND a.date BETWEEN $2 AND $3
                WHERE sb.batch_id = $1
                GROUP BY s.id, s.first_name, s.last_name
                ORDER BY attendance_percent DESC
            `;
            params = [batchId, start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end_date || new Date()];
        }

        const result = await db.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        logger.error('Error fetching attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }
});

// Get student attendance history
router.get('/attendance/student/:studentId', authenticateToken, async (req, res) => {
    try {
        const { start_date, end_date, batch_id } = req.query;
        const studentId = req.params.studentId;

        let query = `
            SELECT 
                a.date,
                a.status,
                a.remarks,
                b.name as batch_name,
                c.name as course_name
            FROM attendance a
            JOIN batches b ON b.id = a.batch_id
            JOIN courses c ON c.id = b.course_id
            WHERE a.student_id = $1
        `;
        const params = [studentId];
        let paramIndex = 2;

        if (batch_id) {
            query += ` AND a.batch_id = $${paramIndex++}`;
            params.push(batch_id);
        }
        if (start_date) {
            query += ` AND a.date >= $${paramIndex++}`;
            params.push(start_date);
        }
        if (end_date) {
            query += ` AND a.date <= $${paramIndex++}`;
            params.push(end_date);
        }

        query += ` ORDER BY a.date DESC`;

        const attendance = await db.query(query, params);

        // Summary
        const summary = await db.getOne(`
            SELECT 
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                COUNT(*) as total,
                ROUND(
                    COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(*), 0), 2
                ) as percentage
            FROM attendance
            WHERE student_id = $1
            ${batch_id ? 'AND batch_id = $2' : ''}
        `, batch_id ? [studentId, batch_id] : [studentId]);

        res.json({
            success: true,
            data: {
                attendance: attendance.rows,
                summary
            }
        });
    } catch (error) {
        logger.error('Error fetching student attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
    }
});

// Mark attendance
router.post('/attendance', authenticateToken, authorizeRoles('admin', 'manager', 'faculty'), async (req, res) => {
    try {
        const { batch_id, date, attendance } = req.body;
        // attendance is array of { student_id, status, remarks }

        const results = [];
        for (const record of attendance) {
            const result = await db.insert(`
                INSERT INTO attendance (student_id, batch_id, date, status, remarks, marked_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (student_id, batch_id, date)
                DO UPDATE SET status = $4, remarks = $5, marked_by = $6, updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [record.student_id, batch_id, date, record.status, record.remarks, req.user.id]);
            results.push(result);
        }

        res.json({
            success: true,
            message: `Attendance marked for ${results.length} students`,
            data: results
        });
    } catch (error) {
        logger.error('Error marking attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to mark attendance' });
    }
});

// Get attendance alerts (students with low attendance)
router.get('/attendance/alerts', authenticateToken, async (req, res) => {
    try {
        const threshold = parseFloat(req.query.threshold) || 75;

        const alerts = await db.getMany(`
            SELECT 
                s.id as student_id,
                s.first_name || ' ' || s.last_name as student_name,
                s.phone,
                s.father_name as parent_name,
                s.father_phone as parent_phone,
                b.name as batch_name,
                COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_days,
                COUNT(a.id) as total_days,
                ROUND(
                    COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(a.id), 0), 2
                ) as attendance_percent
            FROM students s
            JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
            JOIN batches b ON b.id = sb.batch_id
            LEFT JOIN attendance a ON a.student_id = s.id AND a.batch_id = sb.batch_id
                AND a.date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY s.id, b.name
            HAVING ROUND(
                COUNT(CASE WHEN a.status IN ('present', 'late') THEN 1 END) * 100.0 / 
                NULLIF(COUNT(a.id), 0), 2
            ) < $1
            ORDER BY attendance_percent
        `, [threshold]);

        res.json({ success: true, data: alerts });
    } catch (error) {
        logger.error('Error fetching attendance alerts:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch alerts' });
    }
});

module.exports = router;
