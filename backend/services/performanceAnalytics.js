const pool = require('../config/database');
const logger = require('../config/logger');

class PerformanceAnalytics {
  // Get student performance summary
  static async getStudentPerformance(studentId, options = {}) {
    const client = await pool.connect();
    try {
      const { fromDate, toDate, subjectId } = options;
      
      let query = `
        SELECT 
          s.id as student_id,
          s.first_name || ' ' || s.last_name as student_name,
          sub.name as subject,
          e.title as exam_title,
          e.exam_type,
          er.marks_obtained,
          er.total_marks,
          er.percentage,
          er.rank,
          er.exam_date,
          CASE 
            WHEN er.percentage >= 90 THEN 'Excellent'
            WHEN er.percentage >= 75 THEN 'Good'
            WHEN er.percentage >= 60 THEN 'Average'
            WHEN er.percentage >= 40 THEN 'Below Average'
            ELSE 'Needs Improvement'
          END as performance_category
        FROM students s
        JOIN exam_results er ON s.id = er.student_id
        JOIN exams e ON er.exam_id = e.id
        JOIN subjects sub ON e.subject_id = sub.id
        WHERE s.id = $1
      `;
      
      const params = [studentId];
      let paramIndex = 2;
      
      if (fromDate) {
        query += ` AND er.exam_date >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }
      
      if (toDate) {
        query += ` AND er.exam_date <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }
      
      if (subjectId) {
        query += ` AND e.subject_id = $${paramIndex}`;
        params.push(subjectId);
      }
      
      query += ' ORDER BY er.exam_date DESC';
      
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Calculate weak areas for a student
  static async identifyWeakAreas(studentId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          sub.id as subject_id,
          sub.name as subject,
          COUNT(er.id) as total_exams,
          ROUND(AVG(er.percentage), 2) as avg_percentage,
          MIN(er.percentage) as min_percentage,
          MAX(er.percentage) as max_percentage,
          ROUND(STDDEV(er.percentage), 2) as consistency_score,
          CASE 
            WHEN AVG(er.percentage) < 50 THEN 'Critical - Needs Immediate Attention'
            WHEN AVG(er.percentage) < 60 THEN 'Weak - Regular Practice Required'
            WHEN AVG(er.percentage) < 70 THEN 'Moderate - Can Improve'
            ELSE 'Strong'
          END as area_status
        FROM exam_results er
        JOIN exams e ON er.exam_id = e.id
        JOIN subjects sub ON e.subject_id = sub.id
        WHERE er.student_id = $1
        GROUP BY sub.id, sub.name
        ORDER BY avg_percentage ASC
      `;
      
      const result = await client.query(query, [studentId]);
      
      return {
        weakAreas: result.rows.filter(r => r.avg_percentage < 60),
        moderateAreas: result.rows.filter(r => r.avg_percentage >= 60 && r.avg_percentage < 75),
        strongAreas: result.rows.filter(r => r.avg_percentage >= 75),
        allSubjects: result.rows
      };
    } finally {
      client.release();
    }
  }

  // Get performance trends over time
  static async getPerformanceTrend(studentId, months = 6) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          TO_CHAR(er.exam_date, 'YYYY-MM') as month,
          sub.name as subject,
          COUNT(er.id) as exams_taken,
          ROUND(AVG(er.percentage), 2) as avg_percentage,
          SUM(er.marks_obtained) as total_marks_obtained,
          SUM(er.total_marks) as total_possible_marks
        FROM exam_results er
        JOIN exams e ON er.exam_id = e.id
        JOIN subjects sub ON e.subject_id = sub.id
        WHERE er.student_id = $1
          AND er.exam_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY TO_CHAR(er.exam_date, 'YYYY-MM'), sub.name
        ORDER BY month, subject
      `;
      
      const result = await client.query(query, [studentId]);
      
      // Group by month for trend analysis
      const trendData = {};
      result.rows.forEach(row => {
        if (!trendData[row.month]) {
          trendData[row.month] = {
            month: row.month,
            subjects: {},
            overallAvg: 0
          };
        }
        trendData[row.month].subjects[row.subject] = {
          avgPercentage: parseFloat(row.avg_percentage),
          examsCount: parseInt(row.exams_taken)
        };
      });
      
      // Calculate overall average for each month
      Object.keys(trendData).forEach(month => {
        const subjects = Object.values(trendData[month].subjects);
        const totalPercentage = subjects.reduce((sum, s) => sum + s.avgPercentage, 0);
        trendData[month].overallAvg = (totalPercentage / subjects.length).toFixed(2);
      });
      
      return Object.values(trendData);
    } finally {
      client.release();
    }
  }

  // Batch performance analysis
  static async getBatchPerformance(batchId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          b.id as batch_id,
          b.name as batch_name,
          COUNT(DISTINCT s.id) as total_students,
          COUNT(DISTINCT er.id) as total_exam_results,
          ROUND(AVG(er.percentage), 2) as batch_avg_percentage,
          MIN(er.percentage) as min_percentage,
          MAX(er.percentage) as max_percentage,
          COUNT(DISTINCT CASE WHEN er.percentage >= 75 THEN s.id END) as high_performers,
          COUNT(DISTINCT CASE WHEN er.percentage >= 50 AND er.percentage < 75 THEN s.id END) as average_performers,
          COUNT(DISTINCT CASE WHEN er.percentage < 50 THEN s.id END) as low_performers
        FROM batches b
        JOIN student_batches sb ON b.id = sb.batch_id
        JOIN students s ON sb.student_id = s.id
        LEFT JOIN exam_results er ON s.id = er.student_id
        WHERE b.id = $1
        GROUP BY b.id, b.name
      `;
      
      const result = await client.query(query, [batchId]);
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Get top performers in a batch
  static async getTopPerformers(batchId, limit = 10) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          s.id as student_id,
          s.first_name || ' ' || s.last_name as student_name,
          s.email,
          COUNT(er.id) as exams_taken,
          ROUND(AVG(er.percentage), 2) as avg_percentage,
          SUM(er.marks_obtained) as total_marks,
          RANK() OVER (ORDER BY AVG(er.percentage) DESC) as overall_rank
        FROM students s
        JOIN student_batches sb ON s.id = sb.student_id
        JOIN exam_results er ON s.id = er.student_id
        WHERE sb.batch_id = $1
        GROUP BY s.id, s.first_name, s.last_name, s.email
        ORDER BY avg_percentage DESC
        LIMIT $2
      `;
      
      const result = await client.query(query, [batchId, limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Get students needing attention (low performers)
  static async getStudentsNeedingAttention(batchId) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          s.id as student_id,
          s.first_name || ' ' || s.last_name as student_name,
          s.phone as student_phone,
          s.parent_phone,
          ROUND(AVG(er.percentage), 2) as avg_percentage,
          COUNT(DISTINCT CASE WHEN er.percentage < 40 THEN er.id END) as failed_exams,
          STRING_AGG(DISTINCT 
            CASE WHEN sub_avg.avg_pct < 50 THEN sub_avg.subject_name END, 
            ', '
          ) as weak_subjects
        FROM students s
        JOIN student_batches sb ON s.id = sb.student_id
        JOIN exam_results er ON s.id = er.student_id
        LEFT JOIN (
          SELECT 
            er2.student_id,
            sub.name as subject_name,
            AVG(er2.percentage) as avg_pct
          FROM exam_results er2
          JOIN exams e ON er2.exam_id = e.id
          JOIN subjects sub ON e.subject_id = sub.id
          GROUP BY er2.student_id, sub.name
        ) sub_avg ON s.id = sub_avg.student_id
        WHERE sb.batch_id = $1
        GROUP BY s.id, s.first_name, s.last_name, s.phone, s.parent_phone
        HAVING AVG(er.percentage) < 60
        ORDER BY avg_percentage ASC
      `;
      
      const result = await client.query(query, [batchId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Compare student with batch average
  static async compareWithBatch(studentId, batchId) {
    const client = await pool.connect();
    try {
      const studentQuery = `
        SELECT 
          sub.name as subject,
          ROUND(AVG(er.percentage), 2) as student_avg
        FROM exam_results er
        JOIN exams e ON er.exam_id = e.id
        JOIN subjects sub ON e.subject_id = sub.id
        WHERE er.student_id = $1
        GROUP BY sub.name
      `;
      
      const batchQuery = `
        SELECT 
          sub.name as subject,
          ROUND(AVG(er.percentage), 2) as batch_avg
        FROM exam_results er
        JOIN exams e ON er.exam_id = e.id
        JOIN subjects sub ON e.subject_id = sub.id
        JOIN students s ON er.student_id = s.id
        JOIN student_batches sb ON s.id = sb.student_id
        WHERE sb.batch_id = $1
        GROUP BY sub.name
      `;
      
      const [studentResult, batchResult] = await Promise.all([
        client.query(studentQuery, [studentId]),
        client.query(batchQuery, [batchId])
      ]);
      
      // Merge results for comparison
      const batchAvgMap = {};
      batchResult.rows.forEach(row => {
        batchAvgMap[row.subject] = parseFloat(row.batch_avg);
      });
      
      const comparison = studentResult.rows.map(row => ({
        subject: row.subject,
        studentAvg: parseFloat(row.student_avg),
        batchAvg: batchAvgMap[row.subject] || 0,
        difference: (parseFloat(row.student_avg) - (batchAvgMap[row.subject] || 0)).toFixed(2),
        status: parseFloat(row.student_avg) >= (batchAvgMap[row.subject] || 0) ? 'Above Average' : 'Below Average'
      }));
      
      return comparison;
    } finally {
      client.release();
    }
  }

  // Generate insights and recommendations
  static async generateInsights(studentId) {
    const client = await pool.connect();
    try {
      const weakAreas = await this.identifyWeakAreas(studentId);
      const trend = await this.getPerformanceTrend(studentId, 3);
      
      const insights = [];
      const recommendations = [];
      
      // Analyze weak areas
      if (weakAreas.weakAreas.length > 0) {
        insights.push({
          type: 'warning',
          message: `Student has ${weakAreas.weakAreas.length} weak subject(s): ${weakAreas.weakAreas.map(w => w.subject).join(', ')}`
        });
        
        weakAreas.weakAreas.forEach(area => {
          recommendations.push({
            subject: area.subject,
            action: `Schedule extra coaching sessions for ${area.subject}`,
            priority: area.avg_percentage < 40 ? 'High' : 'Medium'
          });
        });
      }
      
      // Analyze trends
      if (trend.length >= 2) {
        const latestMonth = trend[trend.length - 1];
        const previousMonth = trend[trend.length - 2];
        
        const improvement = parseFloat(latestMonth.overallAvg) - parseFloat(previousMonth.overallAvg);
        
        if (improvement > 5) {
          insights.push({
            type: 'success',
            message: `Performance improved by ${improvement.toFixed(2)}% compared to previous month`
          });
        } else if (improvement < -5) {
          insights.push({
            type: 'warning',
            message: `Performance dropped by ${Math.abs(improvement).toFixed(2)}% compared to previous month`
          });
          recommendations.push({
            subject: 'Overall',
            action: 'Schedule parent-teacher meeting to discuss performance decline',
            priority: 'High'
          });
        }
      }
      
      // Consistency analysis
      const inconsistentSubjects = weakAreas.allSubjects.filter(
        s => s.consistency_score && parseFloat(s.consistency_score) > 15
      );
      
      if (inconsistentSubjects.length > 0) {
        insights.push({
          type: 'info',
          message: `Inconsistent performance in: ${inconsistentSubjects.map(s => s.subject).join(', ')}`
        });
        recommendations.push({
          subject: 'Study Habits',
          action: 'Focus on building consistent study routine',
          priority: 'Medium'
        });
      }
      
      return {
        insights,
        recommendations,
        weakAreas: weakAreas.weakAreas,
        strongAreas: weakAreas.strongAreas,
        performanceTrend: trend
      };
    } finally {
      client.release();
    }
  }

  // Faculty performance analysis
  static async getFacultyPerformance(facultyId, months = 6) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          f.id as faculty_id,
          f.first_name || ' ' || f.last_name as faculty_name,
          sub.name as subject,
          COUNT(DISTINCT b.id) as batches_handled,
          COUNT(DISTINCT s.id) as students_taught,
          ROUND(AVG(er.percentage), 2) as avg_student_performance,
          COUNT(DISTINCT CASE WHEN er.percentage >= 75 THEN s.id END) as high_achievers,
          COUNT(DISTINCT CASE WHEN er.percentage < 50 THEN s.id END) as struggling_students
        FROM faculty f
        JOIN batches b ON f.id = b.faculty_id
        JOIN student_batches sb ON b.id = sb.batch_id
        JOIN students s ON sb.student_id = s.id
        JOIN exam_results er ON s.id = er.student_id
        JOIN exams e ON er.exam_id = e.id
        JOIN subjects sub ON e.subject_id = sub.id
        WHERE f.id = $1
          AND er.exam_date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY f.id, f.first_name, f.last_name, sub.name
      `;
      
      const result = await client.query(query, [facultyId]);
      return result.rows;
    } finally {
      client.release();
    }
  }

  // Institute-wide analytics
  static async getInstituteAnalytics() {
    const client = await pool.connect();
    try {
      const queries = {
        overview: `
          SELECT 
            COUNT(DISTINCT s.id) as total_students,
            COUNT(DISTINCT f.id) as total_faculty,
            COUNT(DISTINCT b.id) as total_batches,
            COUNT(DISTINCT e.id) as total_exams_conducted,
            ROUND(AVG(er.percentage), 2) as overall_avg_performance
          FROM students s
          CROSS JOIN faculty f
          CROSS JOIN batches b
          LEFT JOIN exams e ON TRUE
          LEFT JOIN exam_results er ON e.id = er.exam_id
          WHERE s.status = 'active' AND f.status = 'active' AND b.status = 'active'
        `,
        subjectPerformance: `
          SELECT 
            sub.name as subject,
            COUNT(DISTINCT er.student_id) as students,
            ROUND(AVG(er.percentage), 2) as avg_percentage,
            COUNT(er.id) as total_exams
          FROM subjects sub
          JOIN exams e ON sub.id = e.subject_id
          JOIN exam_results er ON e.id = er.exam_id
          GROUP BY sub.name
          ORDER BY avg_percentage DESC
        `,
        monthlyTrend: `
          SELECT 
            TO_CHAR(er.exam_date, 'YYYY-MM') as month,
            COUNT(DISTINCT er.student_id) as students_evaluated,
            ROUND(AVG(er.percentage), 2) as avg_percentage
          FROM exam_results er
          WHERE er.exam_date >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY TO_CHAR(er.exam_date, 'YYYY-MM')
          ORDER BY month
        `
      };
      
      const [overview, subjectPerf, trend] = await Promise.all([
        client.query(queries.overview),
        client.query(queries.subjectPerformance),
        client.query(queries.monthlyTrend)
      ]);
      
      return {
        overview: overview.rows[0],
        subjectPerformance: subjectPerf.rows,
        monthlyTrend: trend.rows
      };
    } catch (error) {
      logger.error('Error getting institute analytics:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = PerformanceAnalytics;
