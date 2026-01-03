const db = require('../config/database');
const logger = require('../config/logger');

class Performance {
    // Get student performance summary
    static async getStudentSummary(studentId) {
        try {
            // Get basic student info
            const student = await db.getOne(`
                SELECT s.*, 
                    json_agg(DISTINCT jsonb_build_object(
                        'batch_id', b.id,
                        'batch_name', b.name,
                        'course_name', c.name
                    )) FILTER (WHERE b.id IS NOT NULL) as batches
                FROM students s
                LEFT JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
                LEFT JOIN batches b ON b.id = sb.batch_id
                LEFT JOIN courses c ON c.id = b.course_id
                WHERE s.id = $1
                GROUP BY s.id
            `, [studentId]);

            if (!student) return null;

            // Get exam performance
            const examPerformance = await db.getMany(`
                SELECT 
                    e.exam_type,
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
                LIMIT 20
            `, [studentId]);

            // Get attendance summary
            const attendanceSummary = await db.getOne(`
                SELECT 
                    COUNT(*) as total_classes,
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                    COUNT(CASE WHEN status = 'late' THEN 1 END) as late,
                    ROUND(
                        COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0), 2
                    ) as attendance_percent
                FROM attendance
                WHERE student_id = $1
                AND date >= CURRENT_DATE - INTERVAL '90 days'
            `, [studentId]);

            // Get subject-wise performance
            const subjectPerformance = await db.getMany(`
                SELECT 
                    e.subject,
                    COUNT(*) as total_exams,
                    ROUND(AVG(er.percentage), 2) as avg_percentage,
                    MAX(er.percentage) as best_percentage,
                    MIN(er.percentage) as lowest_percentage
                FROM exam_results er
                JOIN exams e ON e.id = er.exam_id
                WHERE er.student_id = $1
                GROUP BY e.subject
                ORDER BY avg_percentage DESC
            `, [studentId]);

            // Calculate overall rank in batch
            const rankInfo = await db.getOne(`
                SELECT 
                    COUNT(*) + 1 as rank,
                    (SELECT COUNT(DISTINCT student_id) FROM student_batches WHERE batch_id = sb.batch_id) as total_students
                FROM (
                    SELECT sb2.student_id, AVG(er.percentage) as avg_percent
                    FROM student_batches sb2
                    JOIN exam_results er ON er.student_id = sb2.student_id
                    WHERE sb2.batch_id = (
                        SELECT batch_id FROM student_batches WHERE student_id = $1 LIMIT 1
                    )
                    GROUP BY sb2.student_id
                    HAVING AVG(er.percentage) > (
                        SELECT AVG(percentage) FROM exam_results WHERE student_id = $1
                    )
                ) ranked, student_batches sb
                WHERE sb.student_id = $1
            `, [studentId]);

            return {
                student,
                exam_performance: examPerformance,
                attendance_summary: attendanceSummary,
                subject_performance: subjectPerformance,
                rank_info: rankInfo,
                performance_trend: await this.getPerformanceTrend(studentId)
            };
        } catch (error) {
            logger.error('Error fetching student performance:', error);
            throw error;
        }
    }

    // Get performance trend over time
    static async getPerformanceTrend(studentId, months = 6) {
        try {
            const trend = await db.getMany(`
                SELECT 
                    DATE_TRUNC('month', e.exam_date) as month,
                    ROUND(AVG(er.percentage), 2) as avg_percentage,
                    COUNT(*) as exams_taken
                FROM exam_results er
                JOIN exams e ON e.id = er.exam_id
                WHERE er.student_id = $1
                AND e.exam_date >= CURRENT_DATE - INTERVAL '${months} months'
                GROUP BY DATE_TRUNC('month', e.exam_date)
                ORDER BY month
            `, [studentId]);
            return trend;
        } catch (error) {
            logger.error('Error fetching performance trend:', error);
            throw error;
        }
    }

    // Get batch rankings
    static async getBatchRankings(batchId, examId = null) {
        try {
            let query = `
                SELECT 
                    s.id as student_id,
                    s.first_name || ' ' || s.last_name as student_name,
                    s.photo_url,
                    ROUND(AVG(er.percentage), 2) as avg_percentage,
                    SUM(er.marks_obtained) as total_marks,
                    COUNT(er.id) as exams_taken,
                    RANK() OVER (ORDER BY AVG(er.percentage) DESC) as rank
                FROM students s
                JOIN student_batches sb ON sb.student_id = s.id
                JOIN exam_results er ON er.student_id = s.id
                JOIN exams e ON e.id = er.exam_id
                WHERE sb.batch_id = $1 AND sb.status = 'active'
            `;
            
            const params = [batchId];
            
            if (examId) {
                query += ` AND e.id = $2`;
                params.push(examId);
            }

            query += `
                GROUP BY s.id, s.first_name, s.last_name, s.photo_url
                ORDER BY avg_percentage DESC
            `;

            return await db.getMany(query, params);
        } catch (error) {
            logger.error('Error fetching batch rankings:', error);
            throw error;
        }
    }

    // Get exam results for a specific exam
    static async getExamResults(examId) {
        try {
            const exam = await db.getOne(`
                SELECT * FROM exams WHERE id = $1
            `, [examId]);

            const results = await db.getMany(`
                SELECT 
                    er.*,
                    s.first_name || ' ' || s.last_name as student_name,
                    s.phone as student_phone,
                    RANK() OVER (ORDER BY er.percentage DESC) as rank
                FROM exam_results er
                JOIN students s ON s.id = er.student_id
                WHERE er.exam_id = $1
                ORDER BY er.percentage DESC
            `, [examId]);

            // Calculate statistics
            const stats = await db.getOne(`
                SELECT 
                    COUNT(*) as total_students,
                    ROUND(AVG(percentage), 2) as avg_percentage,
                    MAX(percentage) as highest_percentage,
                    MIN(percentage) as lowest_percentage,
                    COUNT(CASE WHEN percentage >= 90 THEN 1 END) as above_90,
                    COUNT(CASE WHEN percentage >= 75 AND percentage < 90 THEN 1 END) as between_75_90,
                    COUNT(CASE WHEN percentage >= 60 AND percentage < 75 THEN 1 END) as between_60_75,
                    COUNT(CASE WHEN percentage < 60 THEN 1 END) as below_60
                FROM exam_results WHERE exam_id = $1
            `, [examId]);

            return { exam, results, statistics: stats };
        } catch (error) {
            logger.error('Error fetching exam results:', error);
            throw error;
        }
    }

    // Generate progress report for student
    static async generateProgressReport(studentId, startDate, endDate) {
        try {
            const student = await db.getOne(`
                SELECT s.*, 
                    b.name as batch_name,
                    c.name as course_name
                FROM students s
                JOIN student_batches sb ON sb.student_id = s.id AND sb.status = 'active'
                JOIN batches b ON b.id = sb.batch_id
                JOIN courses c ON c.id = b.course_id
                WHERE s.id = $1
            `, [studentId]);

            // Exam performance in date range
            const examPerformance = await db.getMany(`
                SELECT 
                    e.exam_type,
                    e.subject,
                    e.exam_name,
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
                AND e.exam_date BETWEEN $2 AND $3
                ORDER BY e.exam_date
            `, [studentId, startDate, endDate]);

            // Attendance in date range
            const attendance = await db.getOne(`
                SELECT 
                    COUNT(*) as total_classes,
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
                    ROUND(
                        COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0), 2
                    ) as attendance_percent
                FROM attendance
                WHERE student_id = $1
                AND date BETWEEN $2 AND $3
            `, [studentId, startDate, endDate]);

            // Subject-wise breakdown
            const subjectWise = await db.getMany(`
                SELECT 
                    e.subject,
                    COUNT(*) as tests_taken,
                    ROUND(AVG(er.percentage), 2) as avg_score,
                    MAX(er.percentage) as best_score,
                    STRING_AGG(er.remarks, '; ') as remarks
                FROM exam_results er
                JOIN exams e ON e.id = er.exam_id
                WHERE er.student_id = $1
                AND e.exam_date BETWEEN $2 AND $3
                GROUP BY e.subject
            `, [studentId, startDate, endDate]);

            // Fee status
            const feeStatus = await db.getOne(`
                SELECT 
                    SUM(amount) as total_fees,
                    SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
                    SUM(CASE WHEN status IN ('pending', 'overdue') THEN amount ELSE 0 END) as pending_amount
                FROM fees
                WHERE student_id = $1
            `, [studentId]);

            return {
                report_period: { start: startDate, end: endDate },
                generated_at: new Date(),
                student,
                exam_performance: examPerformance,
                attendance,
                subject_wise_performance: subjectWise,
                fee_status: feeStatus,
                overall_grade: this.calculateOverallGrade(examPerformance),
                recommendations: this.generateRecommendations(examPerformance, attendance)
            };
        } catch (error) {
            logger.error('Error generating progress report:', error);
            throw error;
        }
    }

    // Calculate overall grade
    static calculateOverallGrade(examPerformance) {
        if (!examPerformance || examPerformance.length === 0) return 'N/A';
        
        const avgPercentage = examPerformance.reduce((sum, e) => sum + parseFloat(e.percentage || 0), 0) / examPerformance.length;
        
        if (avgPercentage >= 90) return 'A+';
        if (avgPercentage >= 80) return 'A';
        if (avgPercentage >= 70) return 'B+';
        if (avgPercentage >= 60) return 'B';
        if (avgPercentage >= 50) return 'C';
        if (avgPercentage >= 40) return 'D';
        return 'F';
    }

    // Generate recommendations based on performance
    static generateRecommendations(examPerformance, attendance) {
        const recommendations = [];
        
        if (!examPerformance || examPerformance.length === 0) {
            recommendations.push('No exam data available for analysis');
            return recommendations;
        }

        const avgPercentage = examPerformance.reduce((sum, e) => sum + parseFloat(e.percentage || 0), 0) / examPerformance.length;
        
        // Performance-based recommendations
        if (avgPercentage < 50) {
            recommendations.push('Consider additional tutoring or doubt-clearing sessions');
            recommendations.push('Focus on fundamentals and basic concepts');
        } else if (avgPercentage < 70) {
            recommendations.push('Regular practice and revision recommended');
            recommendations.push('Attend doubt-clearing sessions for weak topics');
        } else if (avgPercentage < 85) {
            recommendations.push('Good progress! Focus on advanced problems');
            recommendations.push('Consider taking mock tests for exam preparation');
        } else {
            recommendations.push('Excellent performance! Keep up the good work');
            recommendations.push('Can help peers in study groups');
        }

        // Attendance-based recommendations
        if (attendance && attendance.attendance_percent < 75) {
            recommendations.push('⚠️ Attendance is below 75%. Regular attendance is crucial for success');
        }

        // Subject-specific weak areas
        const weakSubjects = examPerformance.filter(e => parseFloat(e.percentage) < 50);
        if (weakSubjects.length > 0) {
            const subjects = [...new Set(weakSubjects.map(e => e.subject))];
            recommendations.push(`Focus on improving: ${subjects.join(', ')}`);
        }

        return recommendations;
    }

    // Record exam result
    static async recordResult(data) {
        try {
            // Calculate percentage and grade
            const percentage = (data.marks_obtained / data.total_marks) * 100;
            const grade = this.calculateOverallGrade([{ percentage }]);

            const result = await db.insert(`
                INSERT INTO exam_results (
                    exam_id, student_id, marks_obtained, total_marks,
                    percentage, grade, remarks
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (exam_id, student_id)
                DO UPDATE SET
                    marks_obtained = $3,
                    total_marks = $4,
                    percentage = $5,
                    grade = $6,
                    remarks = $7,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *
            `, [
                data.exam_id,
                data.student_id,
                data.marks_obtained,
                data.total_marks,
                percentage.toFixed(2),
                grade,
                data.remarks
            ]);

            return result;
        } catch (error) {
            logger.error('Error recording exam result:', error);
            throw error;
        }
    }

    // Bulk record results
    static async bulkRecordResults(examId, results) {
        try {
            const recorded = [];
            for (const result of results) {
                const res = await this.recordResult({
                    exam_id: examId,
                    ...result
                });
                recorded.push(res);
            }

            // Update ranks
            await db.update(`
                WITH ranked AS (
                    SELECT id, RANK() OVER (ORDER BY percentage DESC) as new_rank
                    FROM exam_results WHERE exam_id = $1
                )
                UPDATE exam_results er
                SET rank = r.new_rank
                FROM ranked r
                WHERE er.id = r.id
            `, [examId]);

            return recorded;
        } catch (error) {
            logger.error('Error bulk recording results:', error);
            throw error;
        }
    }
}

module.exports = Performance;
