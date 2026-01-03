const pool = require('../config/database');
const logger = require('../config/logger');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, '../../reports');
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  // Generate Student Progress Report (PDF)
  async generateStudentProgressReport(studentId, options = {}) {
    const client = await pool.connect();
    try {
      // Fetch student data
      const studentQuery = `
        SELECT 
          s.*,
          STRING_AGG(DISTINCT b.name, ', ') as batches
        FROM students s
        LEFT JOIN student_batches sb ON s.id = sb.student_id
        LEFT JOIN batches b ON sb.batch_id = b.id
        WHERE s.id = $1
        GROUP BY s.id
      `;
      
      const examResultsQuery = `
        SELECT 
          e.title as exam,
          sub.name as subject,
          er.marks_obtained,
          er.total_marks,
          er.percentage,
          er.rank,
          er.exam_date
        FROM exam_results er
        JOIN exams e ON er.exam_id = e.id
        JOIN subjects sub ON e.subject_id = sub.id
        WHERE er.student_id = $1
        ORDER BY er.exam_date DESC
        LIMIT 20
      `;
      
      const attendanceQuery = `
        SELECT 
          COUNT(*) as total_classes,
          COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
          COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent,
          ROUND(COUNT(CASE WHEN status = 'present' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as attendance_percentage
        FROM attendance
        WHERE student_id = $1
          AND date >= CURRENT_DATE - INTERVAL '3 months'
      `;
      
      const feeQuery = `
        SELECT 
          SUM(amount) as total_fees,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
        FROM fees
        WHERE student_id = $1
      `;
      
      const [student, examResults, attendance, fees] = await Promise.all([
        client.query(studentQuery, [studentId]),
        client.query(examResultsQuery, [studentId]),
        client.query(attendanceQuery, [studentId]),
        client.query(feeQuery, [studentId])
      ]);
      
      if (student.rows.length === 0) {
        throw new Error('Student not found');
      }
      
      const studentData = student.rows[0];
      const fileName = `student_progress_${studentId}_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);
      
      // Create PDF
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(24).text('EduPrime Institute', { align: 'center' });
      doc.fontSize(16).text('Student Progress Report', { align: 'center' });
      doc.moveDown();
      
      // Student Info
      doc.fontSize(14).text('Student Information', { underline: true });
      doc.fontSize(11);
      doc.text(`Name: ${studentData.first_name} ${studentData.last_name}`);
      doc.text(`Email: ${studentData.email}`);
      doc.text(`Phone: ${studentData.phone}`);
      doc.text(`Class: ${studentData.class_name || 'N/A'}`);
      doc.text(`Batches: ${studentData.batches || 'N/A'}`);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`);
      doc.moveDown();
      
      // Attendance Summary
      if (attendance.rows[0]) {
        const att = attendance.rows[0];
        doc.fontSize(14).text('Attendance Summary (Last 3 Months)', { underline: true });
        doc.fontSize(11);
        doc.text(`Total Classes: ${att.total_classes}`);
        doc.text(`Present: ${att.present}`);
        doc.text(`Absent: ${att.absent}`);
        doc.text(`Attendance Rate: ${att.attendance_percentage}%`);
        doc.moveDown();
      }
      
      // Fee Summary
      if (fees.rows[0]) {
        const fee = fees.rows[0];
        doc.fontSize(14).text('Fee Summary', { underline: true });
        doc.fontSize(11);
        doc.text(`Total Fees: ₹${fee.total_fees || 0}`);
        doc.text(`Paid: ₹${fee.paid_amount || 0}`);
        doc.text(`Pending: ₹${fee.pending_amount || 0}`);
        doc.moveDown();
      }
      
      // Exam Results
      doc.fontSize(14).text('Recent Exam Results', { underline: true });
      doc.moveDown(0.5);
      
      if (examResults.rows.length > 0) {
        // Table header
        const tableTop = doc.y;
        doc.fontSize(10);
        doc.text('Exam', 50, tableTop);
        doc.text('Subject', 150, tableTop);
        doc.text('Marks', 280, tableTop);
        doc.text('%', 350, tableTop);
        doc.text('Rank', 400, tableTop);
        doc.text('Date', 450, tableTop);
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        
        let y = tableTop + 25;
        examResults.rows.forEach(result => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          doc.text(result.exam.substring(0, 15), 50, y);
          doc.text(result.subject, 150, y);
          doc.text(`${result.marks_obtained}/${result.total_marks}`, 280, y);
          doc.text(`${result.percentage}%`, 350, y);
          doc.text(result.rank ? `#${result.rank}` : '-', 400, y);
          doc.text(new Date(result.exam_date).toLocaleDateString(), 450, y);
          y += 20;
        });
      } else {
        doc.fontSize(11).text('No exam results available');
      }
      
      // Footer
      doc.fontSize(9).text(
        'This is an auto-generated report from EduPrime Institute Management System',
        50, 750,
        { align: 'center' }
      );
      
      doc.end();
      
      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          logger.info(`Student progress report generated: ${fileName}`);
          resolve({ fileName, filePath });
        });
        stream.on('error', reject);
      });
    } finally {
      client.release();
    }
  }

  // Generate Batch Performance Report (Excel)
  async generateBatchReport(batchId) {
    const client = await pool.connect();
    try {
      const batchQuery = `
        SELECT b.*, f.first_name || ' ' || f.last_name as faculty_name
        FROM batches b
        LEFT JOIN faculty f ON b.faculty_id = f.id
        WHERE b.id = $1
      `;
      
      const studentsQuery = `
        SELECT 
          s.id,
          s.first_name || ' ' || s.last_name as name,
          s.email,
          s.phone,
          ROUND(AVG(er.percentage), 2) as avg_percentage,
          COUNT(er.id) as exams_taken,
          ROUND(
            COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / 
            NULLIF(COUNT(a.id), 0), 
          2) as attendance_rate
        FROM students s
        JOIN student_batches sb ON s.id = sb.student_id
        LEFT JOIN exam_results er ON s.id = er.student_id
        LEFT JOIN attendance a ON s.id = a.student_id
        WHERE sb.batch_id = $1
        GROUP BY s.id, s.first_name, s.last_name, s.email, s.phone
        ORDER BY avg_percentage DESC NULLS LAST
      `;
      
      const [batch, students] = await Promise.all([
        client.query(batchQuery, [batchId]),
        client.query(studentsQuery, [batchId])
      ]);
      
      if (batch.rows.length === 0) {
        throw new Error('Batch not found');
      }
      
      const batchData = batch.rows[0];
      const fileName = `batch_report_${batchId}_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'EduPrime';
      workbook.created = new Date();
      
      // Batch Info Sheet
      const infoSheet = workbook.addWorksheet('Batch Info');
      infoSheet.columns = [
        { header: 'Property', key: 'property', width: 20 },
        { header: 'Value', key: 'value', width: 40 }
      ];
      
      infoSheet.addRows([
        { property: 'Batch Name', value: batchData.name },
        { property: 'Subject', value: batchData.subject },
        { property: 'Faculty', value: batchData.faculty_name || 'N/A' },
        { property: 'Schedule', value: batchData.schedule },
        { property: 'Start Time', value: batchData.start_time },
        { property: 'End Time', value: batchData.end_time },
        { property: 'Status', value: batchData.status },
        { property: 'Total Students', value: students.rows.length },
        { property: 'Report Generated', value: new Date().toLocaleString() }
      ]);
      
      // Style header row
      infoSheet.getRow(1).font = { bold: true };
      infoSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      infoSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      
      // Students Performance Sheet
      const studentsSheet = workbook.addWorksheet('Students');
      studentsSheet.columns = [
        { header: 'Rank', key: 'rank', width: 8 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Avg %', key: 'avg_percentage', width: 10 },
        { header: 'Exams', key: 'exams_taken', width: 10 },
        { header: 'Attendance %', key: 'attendance_rate', width: 15 },
        { header: 'Status', key: 'status', width: 15 }
      ];
      
      students.rows.forEach((student, index) => {
        let status = 'Good';
        if (student.avg_percentage < 50) status = 'Needs Attention';
        else if (student.avg_percentage < 60) status = 'Below Average';
        else if (student.avg_percentage >= 75) status = 'Excellent';
        
        studentsSheet.addRow({
          rank: index + 1,
          name: student.name,
          email: student.email,
          phone: student.phone,
          avg_percentage: student.avg_percentage || 'N/A',
          exams_taken: student.exams_taken,
          attendance_rate: student.attendance_rate || 'N/A',
          status
        });
      });
      
      // Style header row
      studentsSheet.getRow(1).font = { bold: true };
      studentsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      studentsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      
      // Conditional formatting for performance
      students.rows.forEach((student, index) => {
        const row = studentsSheet.getRow(index + 2);
        if (student.avg_percentage < 50) {
          row.getCell(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' }
          };
        } else if (student.avg_percentage >= 75) {
          row.getCell(5).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF00FF00' }
          };
        }
      });
      
      await workbook.xlsx.writeFile(filePath);
      
      logger.info(`Batch report generated: ${fileName}`);
      return { fileName, filePath };
    } finally {
      client.release();
    }
  }

  // Generate Fee Collection Report
  async generateFeeCollectionReport(options = {}) {
    const client = await pool.connect();
    try {
      const { fromDate, toDate, status } = options;
      
      let query = `
        SELECT 
          f.id,
          s.first_name || ' ' || s.last_name as student_name,
          s.email,
          s.phone,
          f.fee_type,
          f.amount,
          f.due_date,
          f.status,
          f.payment_date,
          f.payment_method,
          f.transaction_id
        FROM fees f
        JOIN students s ON f.student_id = s.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      if (fromDate) {
        query += ` AND f.due_date >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }
      
      if (toDate) {
        query += ` AND f.due_date <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }
      
      if (status) {
        query += ` AND f.status = $${paramIndex}`;
        params.push(status);
      }
      
      query += ' ORDER BY f.due_date DESC';
      
      const result = await client.query(query, params);
      
      // Summary query
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_records,
          SUM(amount) as total_amount,
          SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as collected_amount,
          SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount,
          SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END) as overdue_amount,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
        FROM fees f
        WHERE 1=1
        ${fromDate ? `AND f.due_date >= '${fromDate}'` : ''}
        ${toDate ? `AND f.due_date <= '${toDate}'` : ''}
      `;
      
      const summaryResult = await client.query(summaryQuery);
      
      const fileName = `fee_collection_report_${Date.now()}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      
      const workbook = new ExcelJS.Workbook();
      
      // Summary Sheet
      const summarySheet = workbook.addWorksheet('Summary');
      const summary = summaryResult.rows[0];
      
      summarySheet.columns = [
        { header: 'Metric', key: 'metric', width: 25 },
        { header: 'Value', key: 'value', width: 20 }
      ];
      
      summarySheet.addRows([
        { metric: 'Report Period', value: `${fromDate || 'All'} to ${toDate || 'All'}` },
        { metric: 'Total Records', value: summary.total_records },
        { metric: 'Total Amount', value: `₹${summary.total_amount || 0}` },
        { metric: 'Collected Amount', value: `₹${summary.collected_amount || 0}` },
        { metric: 'Pending Amount', value: `₹${summary.pending_amount || 0}` },
        { metric: 'Overdue Amount', value: `₹${summary.overdue_amount || 0}` },
        { metric: 'Paid Count', value: summary.paid_count },
        { metric: 'Pending Count', value: summary.pending_count },
        { metric: 'Overdue Count', value: summary.overdue_count },
        { metric: 'Collection Rate', value: `${((summary.collected_amount / summary.total_amount) * 100 || 0).toFixed(2)}%` }
      ]);
      
      // Style
      summarySheet.getRow(1).font = { bold: true };
      summarySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      summarySheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      
      // Details Sheet
      const detailsSheet = workbook.addWorksheet('Fee Details');
      detailsSheet.columns = [
        { header: 'Student', key: 'student_name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Phone', key: 'phone', width: 15 },
        { header: 'Fee Type', key: 'fee_type', width: 15 },
        { header: 'Amount', key: 'amount', width: 12 },
        { header: 'Due Date', key: 'due_date', width: 12 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Payment Date', key: 'payment_date', width: 12 },
        { header: 'Payment Method', key: 'payment_method', width: 15 },
        { header: 'Transaction ID', key: 'transaction_id', width: 20 }
      ];
      
      result.rows.forEach(row => {
        detailsSheet.addRow({
          ...row,
          amount: `₹${row.amount}`,
          due_date: row.due_date ? new Date(row.due_date).toLocaleDateString() : '',
          payment_date: row.payment_date ? new Date(row.payment_date).toLocaleDateString() : ''
        });
      });
      
      detailsSheet.getRow(1).font = { bold: true };
      detailsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      detailsSheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };
      
      await workbook.xlsx.writeFile(filePath);
      
      logger.info(`Fee collection report generated: ${fileName}`);
      return { fileName, filePath, summary: summaryResult.rows[0] };
    } finally {
      client.release();
    }
  }

  // Generate Attendance Report
  async generateAttendanceReport(batchId, month, year) {
    const client = await pool.connect();
    try {
      const query = `
        SELECT 
          s.id as student_id,
          s.first_name || ' ' || s.last_name as student_name,
          a.date,
          a.status
        FROM students s
        JOIN student_batches sb ON s.id = sb.student_id
        LEFT JOIN attendance a ON s.id = a.student_id 
          AND a.batch_id = sb.batch_id
          AND EXTRACT(MONTH FROM a.date) = $2
          AND EXTRACT(YEAR FROM a.date) = $3
        WHERE sb.batch_id = $1
        ORDER BY s.first_name, a.date
      `;
      
      const result = await client.query(query, [batchId, month, year]);
      
      // Get batch info
      const batchResult = await client.query(
        'SELECT name FROM batches WHERE id = $1',
        [batchId]
      );
      
      const fileName = `attendance_${batchId}_${year}_${month}.xlsx`;
      const filePath = path.join(this.reportsDir, fileName);
      
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Attendance');
      
      // Group by student
      const studentAttendance = {};
      result.rows.forEach(row => {
        if (!studentAttendance[row.student_id]) {
          studentAttendance[row.student_id] = {
            name: row.student_name,
            attendance: {},
            present: 0,
            absent: 0,
            late: 0
          };
        }
        if (row.date) {
          const day = new Date(row.date).getDate();
          studentAttendance[row.student_id].attendance[day] = row.status;
          if (row.status === 'present') studentAttendance[row.student_id].present++;
          else if (row.status === 'absent') studentAttendance[row.student_id].absent++;
          else if (row.status === 'late') studentAttendance[row.student_id].late++;
        }
      });
      
      // Create columns - Student name + 31 days + summary
      const columns = [
        { header: 'Student', key: 'name', width: 25 }
      ];
      
      for (let i = 1; i <= 31; i++) {
        columns.push({ header: i.toString(), key: `d${i}`, width: 4 });
      }
      
      columns.push(
        { header: 'Present', key: 'present', width: 8 },
        { header: 'Absent', key: 'absent', width: 8 },
        { header: 'Late', key: 'late', width: 8 },
        { header: '%', key: 'percentage', width: 8 }
      );
      
      sheet.columns = columns;
      
      // Add title
      sheet.mergeCells('A1:AI1');
      sheet.getCell('A1').value = `Attendance Report - ${batchResult.rows[0]?.name || 'Batch'} - ${month}/${year}`;
      sheet.getCell('A1').font = { bold: true, size: 14 };
      sheet.getCell('A1').alignment = { horizontal: 'center' };
      
      // Add headers in row 2
      sheet.getRow(2).values = columns.map(c => c.header);
      sheet.getRow(2).font = { bold: true };
      
      // Add data starting from row 3
      let rowNum = 3;
      Object.values(studentAttendance).forEach(student => {
        const rowData = { name: student.name };
        
        for (let i = 1; i <= 31; i++) {
          const status = student.attendance[i];
          rowData[`d${i}`] = status ? status.charAt(0).toUpperCase() : '';
        }
        
        const total = student.present + student.absent + student.late;
        rowData.present = student.present;
        rowData.absent = student.absent;
        rowData.late = student.late;
        rowData.percentage = total > 0 ? ((student.present / total) * 100).toFixed(1) + '%' : 'N/A';
        
        sheet.addRow(rowData);
        
        // Color code attendance
        const row = sheet.getRow(rowNum);
        for (let i = 1; i <= 31; i++) {
          const cell = row.getCell(i + 1);
          if (cell.value === 'P') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF90EE90' } };
          } else if (cell.value === 'A') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF6347' } };
          } else if (cell.value === 'L') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFA500' } };
          }
        }
        rowNum++;
      });
      
      await workbook.xlsx.writeFile(filePath);
      
      logger.info(`Attendance report generated: ${fileName}`);
      return { fileName, filePath };
    } finally {
      client.release();
    }
  }

  // Generate Daily Summary Report
  async generateDailySummary(date = new Date()) {
    const client = await pool.connect();
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      const queries = {
        attendance: `
          SELECT 
            COUNT(DISTINCT student_id) as total_marked,
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent
          FROM attendance
          WHERE date = $1
        `,
        fees: `
          SELECT 
            COUNT(*) as payments_received,
            COALESCE(SUM(amount), 0) as total_collected
          FROM fees
          WHERE payment_date = $1 AND status = 'paid'
        `,
        newInquiries: `
          SELECT COUNT(*) as count
          FROM inquiries
          WHERE DATE(created_at) = $1
        `,
        upcomingDues: `
          SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
          FROM fees
          WHERE due_date BETWEEN $1 AND $1 + INTERVAL '7 days'
            AND status = 'pending'
        `
      };
      
      const [attendance, fees, inquiries, upcomingDues] = await Promise.all([
        client.query(queries.attendance, [dateStr]),
        client.query(queries.fees, [dateStr]),
        client.query(queries.newInquiries, [dateStr]),
        client.query(queries.upcomingDues, [dateStr])
      ]);
      
      return {
        date: dateStr,
        attendance: attendance.rows[0],
        feeCollection: fees.rows[0],
        newInquiries: inquiries.rows[0].count,
        upcomingDues: upcomingDues.rows[0],
        generatedAt: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }
}

module.exports = new ReportGenerator();
