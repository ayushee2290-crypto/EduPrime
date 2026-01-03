const Fee = require('../models/Fee');
const notificationService = require('./notificationService');
const logger = require('../config/logger');

class FeeReminderService {
    
    // Send reminders for fees due in X days
    async sendReminders(daysBefore = null) {
        const reminderDays = daysBefore !== null 
            ? [daysBefore] 
            : (process.env.FEE_REMINDER_DAYS || '7,3,1,0,-1,-3,-7').split(',').map(Number);

        const results = {
            total: 0,
            sent: 0,
            failed: 0,
            byDay: {}
        };

        for (const days of reminderDays) {
            try {
                const fees = await Fee.getFeesForReminder(days);
                results.byDay[days] = { count: fees.length, sent: 0, failed: 0 };

                for (const fee of fees) {
                    try {
                        await this.sendReminder(fee, days);
                        results.sent++;
                        results.byDay[days].sent++;
                    } catch (error) {
                        results.failed++;
                        results.byDay[days].failed++;
                        logger.error(`Fee reminder failed for ${fee.student_phone}:`, error);
                    }
                }

                results.total += fees.length;

            } catch (error) {
                logger.error(`Error processing reminders for ${days} days:`, error);
            }
        }

        logger.info('Fee reminders completed:', results);
        return results;
    }

    // Send individual reminder
    async sendReminder(fee, daysBefore) {
        const templateCode = this.getTemplateCode(daysBefore);
        const template = await notificationService.getTemplate(templateCode);

        if (!template) {
            logger.warn(`Template not found: ${templateCode}`);
            return;
        }

        const variables = {
            parent_name: fee.father_name || 'Parent',
            student_name: fee.student_name,
            amount: this.formatCurrency(fee.balance_amount),
            due_date: this.formatDate(fee.due_date),
            batch_name: fee.batch_name || 'N/A',
            days: Math.abs(daysBefore),
            late_fee: this.formatCurrency(fee.late_fee || 0),
            payment_link: `${process.env.INSTITUTE_WEBSITE}/pay/${fee.id}`
        };

        const message = notificationService.replaceVariables(template.body, variables);

        // Send WhatsApp to parent
        if (fee.father_phone) {
            await notificationService.send({
                channel: 'whatsapp',
                recipient_phone: fee.father_phone,
                body: message,
                template_id: template.id,
                reference_type: 'fee_reminder',
                reference_id: fee.id
            });
        }

        // Also send email if available
        if (fee.father_email || fee.student_email) {
            await notificationService.send({
                channel: 'email',
                recipient_email: fee.father_email || fee.student_email,
                subject: `Fee Reminder - ${fee.student_name} - EduPrime Institute`,
                body: message,
                template_id: template.id,
                reference_type: 'fee_reminder',
                reference_id: fee.id
            });
        }
    }

    // Get appropriate template based on days
    getTemplateCode(daysBefore) {
        if (daysBefore > 0) {
            return `FEE_REMIND_${daysBefore}`;
        } else if (daysBefore === 0) {
            return 'FEE_REMIND_0';
        } else {
            return 'FEE_OVERDUE';
        }
    }

    // Send overdue notifications
    async sendOverdueNotifications() {
        const overdueFees = await Fee.getOverdueFees();
        const results = { total: overdueFees.length, sent: 0, failed: 0 };

        for (const fee of overdueFees) {
            try {
                // Apply late fee if applicable
                if (fee.days_overdue > (process.env.FEE_GRACE_PERIOD || 7)) {
                    const lateFeePercent = parseFloat(process.env.LATE_FEE_PERCENTAGE || 2);
                    const lateFee = (fee.balance_amount * lateFeePercent) / 100;
                    
                    if (fee.late_fee < lateFee) {
                        await Fee.applyLateFee(fee.id, lateFee - fee.late_fee);
                    }
                }

                await this.sendReminder(fee, -fee.days_overdue);
                results.sent++;

            } catch (error) {
                results.failed++;
                logger.error(`Overdue notification failed for ${fee.student_phone}:`, error);
            }
        }

        logger.info('Overdue notifications completed:', results);
        return results;
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
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

module.exports = new FeeReminderService();
