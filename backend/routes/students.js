const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const db = require('../config/database');
const logger = require('../config/logger');

// Helper: success response wrapper
function ok(res, data) {
    return res.json({ success: true, data });
}

// Helper: safe table existence check (prevents 500s if schema differs)
async function tableExists(tableName) {
    try {
        const row = await db.getOne(
            `SELECT to_regclass($1) as regclass`,
            [tableName]
        );
        return !!(row && row.regclass);
    } catch (e) {
        return false;
    }
}

// ===========================================
// CONSOLIDATED STUDENT MANAGEMENT ENDPOINTS
// ===========================================

// Student overview: profile + batches + attendance summary + fee summary + recent exams
router.get('/:id/overview', async (req, res) => {
    try {
        const studentId = req.params.id;

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Batch details (richer than Student.findById aggregation)
        const batches = await db.getMany(
            `
            SELECT 
                b.*, 
                c.name as course_name,
                c.course_type,
                sb.enrollment_date,
                sb.roll_number,
                sb.status as enrollment_status
            FROM student_batches sb
            JOIN batches b ON b.id = sb.batch_id
            LEFT JOIN courses c ON c.id = b.course_id
            WHERE sb.student_id = $1 AND sb.status = 'active'
            ORDER BY sb.enrollment_date DESC NULLS LAST, b.start_date DESC NULLS LAST
            `,
            [studentId]
        );

        // Attendance summary for last N days (grouped by batch)
        const Attendance = require('../models/Attendance');
        const attendanceDays = req.query.attendance_days ? parseInt(req.query.attendance_days) : 30;
        const endDate = new Date();
        const startDate = new Date(Date.now() - attendanceDays * 24 * 60 * 60 * 1000);
        const attendance_summary = await Attendance.getStudentSummary(studentId, startDate, endDate);

        // Fees + a compact summary
        const Fee = require('../models/Fee');
        const fees = await Fee.findByStudent(studentId);
        const fee_summary = fees.reduce(
            (acc, f) => {
                acc.total_net_amount += Number(f.net_amount || 0);
                acc.total_paid_amount += Number(f.paid_amount || 0);
                acc.total_balance_amount += Number(f.balance_amount || 0);
                if (['overdue'].includes(f.status)) acc.overdue_count += 1;
                if (['pending', 'partial', 'overdue'].includes(f.status)) acc.pending_count += 1;
                return acc;
            },
            {
                total_net_amount: 0,
                total_paid_amount: 0,
                total_balance_amount: 0,
                pending_count: 0,
                overdue_count: 0
            }
        );

        // Recent exam results from the active schema in this repo
        const Exam = require('../models/Exam');
        const recent_results = await Exam.getStudentResults(studentId, req.query.exam_limit ? parseInt(req.query.exam_limit) : 10);

        // Optional: syllabus progress (requires syllabus tables/views)
        let syllabus_progress = null;
        if (req.query.include_syllabus === 'true') {
            const hasSyllabusTopics = await tableExists('syllabus_topics');
            const hasSyllabusProgress = await tableExists('syllabus_progress');
            if (hasSyllabusTopics && hasSyllabusProgress && batches.length > 0) {
                // Use first active batch as default
                const Batch = require('../models/Batch');
                syllabus_progress = await Batch.getSyllabusProgress(batches[0].id);
            } else {
                syllabus_progress = [];
            }
        }

        return ok(res, {
            student,
            batches,
            attendance_summary,
            fees,
            fee_summary,
            recent_results,
            syllabus_progress
        });
    } catch (error) {
        logger.error('Get student overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student overview',
            error: error.message
        });
    }
});

// Student batches (richer list, useful for UI)
router.get('/:id/batches', async (req, res) => {
    try {
        const studentId = req.params.id;
        const rows = await db.getMany(
            `
            SELECT 
                b.*, 
                c.name as course_name,
                c.course_type,
                sb.enrollment_date,
                sb.roll_number,
                sb.status as enrollment_status
            FROM student_batches sb
            JOIN batches b ON b.id = sb.batch_id
            LEFT JOIN courses c ON c.id = b.course_id
            WHERE sb.student_id = $1
            ORDER BY (sb.status = 'active') DESC, sb.enrollment_date DESC NULLS LAST
            `,
            [studentId]
        );
        return ok(res, rows);
    } catch (error) {
        logger.error('Get student batches error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch student batches', error: error.message });
    }
});

// Get all students
router.get('/', async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            target_exam: req.query.target_exam,
            batch_id: req.query.batch_id,
            search: req.query.search,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined
        };

        const students = await Student.findAll(filters);

        res.json({
            success: true,
            count: students.length,
            data: students
        });

    } catch (error) {
        logger.error('Get students error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch students',
            error: error.message
        });
    }
});

// Get student by ID
router.get('/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: student
        });

    } catch (error) {
        logger.error('Get student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student',
            error: error.message
        });
    }
});

// Create new student
router.post('/', async (req, res) => {
    try {
        const { first_name, last_name, phone } = req.body;

        // Validate required fields
        if (!first_name || !last_name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'First name, last name, and phone are required'
            });
        }

        // Check if phone already exists
        const existing = await Student.findByPhone(phone);
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'A student with this phone number already exists'
            });
        }

        const student = await Student.create(req.body);

        res.status(201).json({
            success: true,
            message: 'Student created successfully',
            data: student
        });

    } catch (error) {
        logger.error('Create student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create student',
            error: error.message
        });
    }
});

// Update student
router.put('/:id', async (req, res) => {
    try {
        const student = await Student.update(req.params.id, req.body);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found or no changes made'
            });
        }

        res.json({
            success: true,
            message: 'Student updated successfully',
            data: student
        });

    } catch (error) {
        logger.error('Update student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update student',
            error: error.message
        });
    }
});

// Enroll student
router.post('/:id/enroll', async (req, res) => {
    try {
        const { batch_id } = req.body;

        if (!batch_id) {
            return res.status(400).json({
                success: false,
                message: 'Batch ID is required'
            });
        }

        const student = await Student.enroll(req.params.id, batch_id);

        res.json({
            success: true,
            message: 'Student enrolled successfully',
            data: student
        });

    } catch (error) {
        logger.error('Enroll student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to enroll student',
            error: error.message
        });
    }
});

// Get student performance
router.get('/:id/performance', async (req, res) => {
    try {
        const Exam = require('../models/Exam');
        const results = await Exam.getStudentResults(req.params.id, req.query.limit || 20);

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        logger.error('Get performance error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch performance',
            error: error.message
        });
    }
});

// Get student attendance
router.get('/:id/attendance', async (req, res) => {
    try {
        const Attendance = require('../models/Attendance');
        const startDate = req.query.start_date || new Date(new Date().setMonth(new Date().getMonth() - 1));
        const endDate = req.query.end_date || new Date();

        const attendance = await Attendance.getStudentSummary(req.params.id, startDate, endDate);

        res.json({
            success: true,
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

// Get student fees
router.get('/:id/fees', async (req, res) => {
    try {
        const Fee = require('../models/Fee');
        const fees = await Fee.findByStudent(req.params.id);

        res.json({
            success: true,
            data: fees
        });

    } catch (error) {
        logger.error('Get fees error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch fees',
            error: error.message
        });
    }
});

// Get students with low attendance
router.get('/reports/low-attendance', async (req, res) => {
    try {
        const threshold = req.query.threshold || 75;
        const students = await Student.getLowAttendance(threshold);

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

// Get student count by status
router.get('/reports/count-by-status', async (req, res) => {
    try {
        const counts = await Student.getCountByStatus();

        res.json({
            success: true,
            data: counts
        });

    } catch (error) {
        logger.error('Get count error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch student counts',
            error: error.message
        });
    }
});

// Delete student (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const student = await Student.delete(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            message: 'Student deactivated successfully',
            data: student
        });

    } catch (error) {
        logger.error('Delete student error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete student',
            error: error.message
        });
    }
});

// ===========================================
// ENHANCED STUDENT MANAGEMENT ENDPOINTS
// ===========================================

// ---- COURSE DETAILS (Class 9–12, IIT-JEE, NEET, Foundation) ----

// Get all courses with category grouping
router.get('/catalog/courses', async (req, res) => {
    try {
        const Course = require('../models/Course');
        const courses = await Course.getAll(req.query);

        // Group by course_type for UI convenience
        const grouped = courses.reduce((acc, c) => {
            const type = c.course_type || 'other';
            if (!acc[type]) acc[type] = [];
            acc[type].push(c);
            return acc;
        }, {});

        return ok(res, { courses, grouped });
    } catch (error) {
        logger.error('Get courses catalog error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch courses', error: error.message });
    }
});

// Get single course details with batches, subjects, syllabus
router.get('/catalog/courses/:courseId', async (req, res) => {
    try {
        const Course = require('../models/Course');
        const course = await Course.getById(req.params.courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        return ok(res, course);
    } catch (error) {
        logger.error('Get course detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch course', error: error.message });
    }
});

// ---- BATCH TIMINGS, FACULTY INFO, SYLLABUS COVERAGE ----

// Get batch details with schedule, faculty, syllabus progress
router.get('/catalog/batches/:batchId', async (req, res) => {
    try {
        const Batch = require('../models/Batch');
        const batch = await Batch.findById(req.params.batchId);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        // Get syllabus coverage for the batch
        let syllabus_progress = [];
        const hasSyllabusTopics = await tableExists('syllabus_topics');
        const hasSyllabusProgress = await tableExists('syllabus_progress');
        if (hasSyllabusTopics && hasSyllabusProgress) {
            syllabus_progress = await Batch.getSyllabusProgress(req.params.batchId);
        } else {
            // fallback: try syllabus table joined to course
            const rows = await db.getMany(
                `SELECT s.* FROM syllabus s WHERE s.course_id = $1 ORDER BY s.subject_id, s.chapter_order`,
                [batch.course_id]
            );
            syllabus_progress = rows;
        }

        return ok(res, { batch, syllabus_progress });
    } catch (error) {
        logger.error('Get batch detail error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch batch', error: error.message });
    }
});

// List batches (optionally filter by course)
router.get('/catalog/batches', async (req, res) => {
    try {
        const Batch = require('../models/Batch');
        const batches = await Batch.findAll(req.query);
        return ok(res, batches);
    } catch (error) {
        logger.error('List batches error:', error);
        res.status(500).json({ success: false, message: 'Failed to list batches', error: error.message });
    }
});

// ---- FEE STRUCTURE, INSTALLMENTS, DISCOUNTS, SCHOLARSHIPS ----

// Get fee structure for a course (installments, scholarships)
router.get('/catalog/courses/:courseId/fee-structure', async (req, res) => {
    try {
        const Course = require('../models/Course');
        const feeStructure = await Course.getFeeStructure(req.params.courseId);
        if (!feeStructure) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        return ok(res, feeStructure);
    } catch (error) {
        logger.error('Get fee structure error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch fee structure', error: error.message });
    }
});

// Get student fee details including installments, payments, balance
router.get('/:id/fee-details', async (req, res) => {
    try {
        const studentId = req.params.id;
        const Fee = require('../models/Fee');
        const fees = await Fee.findByStudent(studentId);

        // Get payment history per fee record
        const feeIds = fees.map(f => f.id);
        let payments = [];
        if (feeIds.length > 0) {
            payments = await db.getMany(
                `SELECT fp.* FROM fee_payments fp WHERE fp.student_fee_id = ANY($1) ORDER BY fp.payment_date DESC`,
                [feeIds]
            );
        }

        // Summary stats
        const summary = fees.reduce((acc, f) => {
            acc.total_net += Number(f.net_amount || 0);
            acc.total_paid += Number(f.paid_amount || 0);
            acc.total_balance += Number(f.balance_amount || 0);
            if (['overdue'].includes(f.status)) acc.overdue_count += 1;
            return acc;
        }, { total_net: 0, total_paid: 0, total_balance: 0, overdue_count: 0 });

        return ok(res, { fees, payments, summary });
    } catch (error) {
        logger.error('Get student fee details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch fee details', error: error.message });
    }
});

// ---- ADMISSIONS & ENROLLMENT WORKFLOW ----

// Start admission / inquiry → registered → enrolled pipeline
router.post('/:id/admit', async (req, res) => {
    try {
        const studentId = req.params.id;
        const { batch_id, discount_amount, discount_reason, scholarship_amount, scholarship_name, notes } = req.body;

        if (!batch_id) {
            return res.status(400).json({ success: false, message: 'batch_id is required' });
        }

        const Batch = require('../models/Batch');
        const batch = await Batch.findById(batch_id);
        if (!batch) {
            return res.status(404).json({ success: false, message: 'Batch not found' });
        }

        // Enroll in batch (updates student status)
        const student = await Student.enroll(studentId, batch_id);

        // Automatically create fee record based on batch fee
        const Fee = require('../models/Fee');
        const feeRecord = await Fee.create({
            student_id: studentId,
            batch_id,
            total_amount: batch.batch_fee || 0,
            discount_amount: discount_amount || 0,
            discount_reason,
            scholarship_amount: scholarship_amount || 0,
            scholarship_name,
            due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // due in 15 days
            academic_year: batch.academic_year || new Date().getFullYear(),
            notes
        });

        return ok(res, { student, fee: feeRecord, message: 'Student admitted and fee record created' });
    } catch (error) {
        logger.error('Admit student error:', error);
        res.status(500).json({ success: false, message: 'Failed to admit student', error: error.message });
    }
});

// ---- BATCH ALLOCATION & UPGRADES ----

// Add student to additional batch
router.post('/:id/batches', async (req, res) => {
    try {
        const studentId = req.params.id;
        const { batch_id, roll_number } = req.body;
        if (!batch_id) {
            return res.status(400).json({ success: false, message: 'batch_id is required' });
        }

        const Batch = require('../models/Batch');
        const result = await Batch.addStudent(batch_id, studentId, roll_number);
        return ok(res, { enrollment: result, message: 'Student added to batch' });
    } catch (error) {
        logger.error('Add student to batch error:', error);
        res.status(500).json({ success: false, message: 'Failed to add student to batch', error: error.message });
    }
});

// Remove student from batch
router.delete('/:id/batches/:batchId', async (req, res) => {
    try {
        const { id: studentId, batchId } = req.params;
        await db.update(
            `UPDATE student_batches SET status = 'withdrawn' WHERE student_id = $1 AND batch_id = $2`,
            [studentId, batchId]
        );
        return ok(res, { message: 'Student removed from batch' });
    } catch (error) {
        logger.error('Remove student from batch error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove student from batch', error: error.message });
    }
});

// Upgrade student to a new batch (withdraw from old, enroll in new)
router.post('/:id/upgrade-batch', async (req, res) => {
    try {
        const studentId = req.params.id;
        const { from_batch_id, to_batch_id } = req.body;
        if (!from_batch_id || !to_batch_id) {
            return res.status(400).json({ success: false, message: 'from_batch_id and to_batch_id are required' });
        }

        await db.transaction(async (client) => {
            // Withdraw from old
            await client.query(
                `UPDATE student_batches SET status = 'completed' WHERE student_id = $1 AND batch_id = $2`,
                [studentId, from_batch_id]
            );
            // Enroll in new
            await client.query(
                `INSERT INTO student_batches (student_id, batch_id, status) VALUES ($1, $2, 'active') ON CONFLICT DO NOTHING`,
                [studentId, to_batch_id]
            );
        });

        return ok(res, { message: 'Batch upgraded successfully' });
    } catch (error) {
        logger.error('Upgrade batch error:', error);
        res.status(500).json({ success: false, message: 'Failed to upgrade batch', error: error.message });
    }
});

// ---- ATTENDANCE TRACKING (Student & Faculty view) ----

// Get attendance calendar for a student (month view)
router.get('/:id/attendance/calendar', async (req, res) => {
    try {
        const studentId = req.params.id;
        const year = parseInt(req.query.year) || new Date().getFullYear();
        const month = parseInt(req.query.month) || (new Date().getMonth() + 1);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const rows = await db.getMany(
            `SELECT a.date, a.status, a.remarks, b.name as batch_name
             FROM attendance a
             LEFT JOIN batches b ON b.id = a.batch_id
             WHERE a.student_id = $1 AND a.date BETWEEN $2 AND $3
             ORDER BY a.date`,
            [studentId, startDate, endDate]
        );

        // Build calendar map
        const calendar = {};
        rows.forEach(r => {
            const day = new Date(r.date).getDate();
            calendar[day] = { status: r.status, remarks: r.remarks, batch_name: r.batch_name };
        });

        return ok(res, { year, month, calendar, records: rows });
    } catch (error) {
        logger.error('Get attendance calendar error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance calendar', error: error.message });
    }
});

// Mark attendance for a student (admin / faculty)
router.post('/:id/attendance', async (req, res) => {
    try {
        const studentId = req.params.id;
        const { batch_id, date, status, remarks, marked_by } = req.body;

        if (!batch_id || !date || !status) {
            return res.status(400).json({ success: false, message: 'batch_id, date, and status are required' });
        }

        const result = await db.insert(
            `INSERT INTO attendance (student_id, batch_id, date, status, remarks, marked_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (student_id, batch_id, date) DO UPDATE
             SET status = EXCLUDED.status, remarks = EXCLUDED.remarks, marked_by = EXCLUDED.marked_by
             RETURNING *`,
            [studentId, batch_id, date, status, remarks, marked_by]
        );

        return ok(res, result);
    } catch (error) {
        logger.error('Mark attendance error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark attendance', error: error.message });
    }
});

// ---- PERFORMANCE TRACKING (tests, ranks, progress reports) ----

// Get detailed performance for a student
router.get('/:id/performance/summary', async (req, res) => {
    try {
        const Performance = require('../models/Performance');
        const summary = await Performance.getStudentSummary(req.params.id);
        if (!summary) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }
        return ok(res, summary);
    } catch (error) {
        logger.error('Get performance summary error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch performance summary', error: error.message });
    }
});

// Get student rank within batch / overall
router.get('/:id/performance/rank', async (req, res) => {
    try {
        const studentId = req.params.id;
        const batchId = req.query.batch_id;

        let query;
        const params = [studentId];

        if (batchId) {
            params.push(batchId);
            query = `
                WITH student_avg AS (
                    SELECT AVG(er.percentage) as avg_pct
                    FROM exam_results er
                    WHERE er.student_id = $1
                ),
                batch_ranks AS (
                    SELECT sb.student_id, AVG(er.percentage) as avg_pct,
                           RANK() OVER (ORDER BY AVG(er.percentage) DESC) as rank
                    FROM student_batches sb
                    JOIN exam_results er ON er.student_id = sb.student_id
                    WHERE sb.batch_id = $2 AND sb.status = 'active'
                    GROUP BY sb.student_id
                )
                SELECT br.rank, br.avg_pct, (SELECT COUNT(*) FROM batch_ranks) as total_students
                FROM batch_ranks br
                WHERE br.student_id = $1
            `;
        } else {
            query = `
                WITH student_avg AS (
                    SELECT AVG(percentage) as avg_pct FROM exam_results WHERE student_id = $1
                ),
                all_ranks AS (
                    SELECT student_id, AVG(percentage) as avg_pct,
                           RANK() OVER (ORDER BY AVG(percentage) DESC) as rank
                    FROM exam_results GROUP BY student_id
                )
                SELECT ar.rank, ar.avg_pct, (SELECT COUNT(*) FROM all_ranks) as total_students
                FROM all_ranks ar
                WHERE ar.student_id = $1
            `;
        }

        const row = await db.getOne(query, params);
        return ok(res, row || { rank: null, avg_pct: null, total_students: 0 });
    } catch (error) {
        logger.error('Get rank error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch rank', error: error.message });
    }
});

// Get progress report (combines attendance + performance + fee status)
router.get('/:id/progress-report', async (req, res) => {
    try {
        const studentId = req.params.id;

        // Re-use the overview endpoint logic but structure as a report
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        const Performance = require('../models/Performance');
        const performanceSummary = await Performance.getStudentSummary(studentId);

        const Fee = require('../models/Fee');
        const fees = await Fee.findByStudent(studentId);
        const fee_summary = fees.reduce((acc, f) => {
            acc.total_net += Number(f.net_amount || 0);
            acc.total_paid += Number(f.paid_amount || 0);
            acc.total_balance += Number(f.balance_amount || 0);
            if (['overdue'].includes(f.status)) acc.overdue_count += 1;
            return acc;
        }, { total_net: 0, total_paid: 0, total_balance: 0, overdue_count: 0 });

        return ok(res, {
            student: performanceSummary?.student || student,
            attendance_summary: performanceSummary?.attendance_summary,
            subject_performance: performanceSummary?.subject_performance,
            rank_info: performanceSummary?.rank_info,
            performance_trend: performanceSummary?.performance_trend,
            fee_summary,
            generated_at: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Get progress report error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate progress report', error: error.message });
    }
});

module.exports = router;
