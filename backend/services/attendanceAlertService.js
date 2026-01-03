const Attendance = require('../models/Attendance');
const notificationService = require('./notificationService');
const logger = require('../config/logger');

class AttendanceAlertService {

    // Send alerts for today's absentees
    async sendAbsenceAlerts(batchId = null) {
        const absentees = await Attendance.getTodayAbsentees(batchId);
        const results = { total: absentees.length, sent: 0, failed: 0 };

        const template = await notificationService.getTemplate('ATTENDANCE_ABSENT');

        for (const student of absentees) {
            try {
                const variables = {
                    parent_name: student.father_name || 'Parent',
                    student_name: student.student_name,
                    date: this.formatDate(student.attendance_date),
                    batch_name: student.batch_name
                };

                const message = notificationService.replaceVariables(template.body, variables);

                // Send WhatsApp to parent
                if (student.father_phone) {
                    await notificationService.send({
                        channel: 'whatsapp',
                        recipient_phone: student.father_phone,
                        body: message,
                        template_id: template.id,
                        reference_type: 'attendance_alert',
                        reference_id: student.id
                    });
                }

                results.sent++;

            } catch (error) {
                results.failed++;
                logger.error(`Absence alert failed for ${student.student_name}:`, error);
            }
        }

        logger.info('Absence alerts completed:', results);
        return results;
    }

    // Send low attendance warnings
    async sendLowAttendanceWarnings(threshold = 75) {
        const lowAttendance = await Attendance.getLowAttendance(threshold);
        const results = { total: lowAttendance.length, sent: 0, failed: 0 };

        const template = await notificationService.getTemplate('ATTENDANCE_LOW');

        for (const student of lowAttendance) {
            try {
                const variables = {
                    parent_name: 'Parent',
                    student_name: student.student_name,
                    percentage: student.attendance_percentage,
                    batch_name: student.batch_name
                };

                const message = notificationService.replaceVariables(template.body, variables);

                // Send WhatsApp
                if (student.phone) {
                    await notificationService.send({
                        channel: 'whatsapp',
                        recipient_phone: student.phone,
                        body: message,
                        template_id: template.id,
                        reference_type: 'low_attendance_warning',
                        reference_id: student.student_id
                    });
                }

                results.sent++;

            } catch (error) {
                results.failed++;
                logger.error(`Low attendance warning failed for ${student.student_name}:`, error);
            }
        }

        logger.info('Low attendance warnings completed:', results);
        return results;
    }

    // Send consecutive absence alerts
    async sendConsecutiveAbsenceAlerts(days = 3) {
        const consecutiveAbsences = await Attendance.getConsecutiveAbsences(days);
        const results = { total: consecutiveAbsences.length, sent: 0, failed: 0 };

        for (const student of consecutiveAbsences) {
            try {
                const message = `Dear ${student.father_name || 'Parent'}, your ward ${student.student_name} has been absent for ${student.consecutive_days} consecutive days in ${student.batch_name}. Please contact the institute immediately. - EduPrime Institute`;

                // Send WhatsApp
                if (student.father_phone) {
                    await notificationService.send({
                        channel: 'whatsapp',
                        recipient_phone: student.father_phone,
                        body: message,
                        reference_type: 'consecutive_absence_alert',
                        reference_id: student.student_id
                    });
                }

                // Also send SMS for urgency
                if (student.father_phone) {
                    await notificationService.send({
                        channel: 'sms',
                        recipient_phone: student.father_phone,
                        body: message,
                        reference_type: 'consecutive_absence_alert',
                        reference_id: student.student_id
                    });
                }

                results.sent++;

            } catch (error) {
                results.failed++;
                logger.error(`Consecutive absence alert failed for ${student.student_name}:`, error);
            }
        }

        logger.info('Consecutive absence alerts completed:', results);
        return results;
    }

    // Format date
    formatDate(date) {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }
}

module.exports = new AttendanceAlertService();
