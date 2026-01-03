const axios = require('axios');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const db = require('../config/database');
const logger = require('../config/logger');

class NotificationService {
    constructor() {
        // Initialize Twilio client
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
        }

        // Initialize email transporter
        if (process.env.SMTP_HOST) {
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
    }

    // Main send method
    async send(options) {
        const { channel, recipient_phone, recipient_email, subject, body, template_id, reference_type, reference_id } = options;

        try {
            let result;

            switch (channel) {
                case 'whatsapp':
                    result = await this.sendWhatsApp(recipient_phone, body);
                    break;
                case 'sms':
                    result = await this.sendSMS(recipient_phone, body);
                    break;
                case 'email':
                    result = await this.sendEmail(recipient_email, subject, body);
                    break;
                default:
                    throw new Error(`Unknown notification channel: ${channel}`);
            }

            // Log notification
            await this.logNotification({
                template_id,
                channel,
                recipient_phone,
                recipient_email,
                subject,
                body,
                status: 'sent',
                reference_type,
                reference_id
            });

            return result;

        } catch (error) {
            logger.error(`Notification send error (${channel}):`, error);

            // Log failed notification
            await this.logNotification({
                template_id,
                channel,
                recipient_phone,
                recipient_email,
                subject,
                body,
                status: 'failed',
                error_message: error.message,
                reference_type,
                reference_id
            });

            throw error;
        }
    }

    // Send WhatsApp message via Meta API
    async sendWhatsApp(phone, message) {
        if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID) {
            logger.warn('WhatsApp credentials not configured');
            return { success: false, message: 'WhatsApp not configured' };
        }

        // Format phone number
        const formattedPhone = this.formatPhoneNumber(phone);

        try {
            const response = await axios.post(
                `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`,
                {
                    messaging_product: 'whatsapp',
                    to: formattedPhone,
                    type: 'text',
                    text: { body: message }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info(`WhatsApp sent to ${phone}`, { messageId: response.data.messages?.[0]?.id });
            return { success: true, messageId: response.data.messages?.[0]?.id };

        } catch (error) {
            logger.error('WhatsApp API error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.error?.message || 'WhatsApp send failed');
        }
    }

    // Send SMS via Twilio
    async sendSMS(phone, message) {
        if (!this.twilioClient) {
            logger.warn('Twilio credentials not configured');
            return { success: false, message: 'SMS not configured' };
        }

        const formattedPhone = this.formatPhoneNumber(phone);

        try {
            const result = await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE,
                to: formattedPhone
            });

            logger.info(`SMS sent to ${phone}`, { sid: result.sid });
            return { success: true, sid: result.sid };

        } catch (error) {
            logger.error('Twilio SMS error:', error.message);
            throw new Error(error.message);
        }
    }

    // Send Email
    async sendEmail(to, subject, body, html = null) {
        if (!this.emailTransporter) {
            logger.warn('Email credentials not configured');
            return { success: false, message: 'Email not configured' };
        }

        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || process.env.SMTP_USER,
                to,
                subject,
                text: body,
                html: html || body.replace(/\n/g, '<br>')
            };

            const info = await this.emailTransporter.sendMail(mailOptions);
            logger.info(`Email sent to ${to}`, { messageId: info.messageId });
            return { success: true, messageId: info.messageId };

        } catch (error) {
            logger.error('Email send error:', error.message);
            throw new Error(error.message);
        }
    }

    // Send bulk notifications
    async sendBulk(options) {
        const { channel, template_code, recipients, variables } = options;

        let template = null;
        if (template_code) {
            template = await db.getOne(
                'SELECT * FROM notification_templates WHERE code = $1 AND is_active = true',
                [template_code]
            );
        }

        const results = { success: 0, failed: 0, errors: [] };

        for (const recipient of recipients) {
            try {
                let body = template ? template.body : options.body;
                let subject = template?.subject || options.subject;

                // Replace variables
                const recipientVars = { ...variables, ...recipient };
                body = this.replaceVariables(body, recipientVars);
                if (subject) {
                    subject = this.replaceVariables(subject, recipientVars);
                }

                await this.send({
                    channel,
                    recipient_phone: recipient.phone,
                    recipient_email: recipient.email,
                    subject,
                    body,
                    template_id: template?.id,
                    reference_type: options.reference_type,
                    reference_id: recipient.reference_id
                });

                results.success++;

            } catch (error) {
                results.failed++;
                results.errors.push({
                    recipient: recipient.phone || recipient.email,
                    error: error.message
                });
            }

            // Small delay to avoid rate limiting
            await this.delay(100);
        }

        return results;
    }

    // Replace template variables
    replaceVariables(text, variables) {
        if (!text) return text;
        
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    // Format phone number to international format
    formatPhoneNumber(phone) {
        if (!phone) return phone;
        
        // Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');
        
        // Add India country code if not present
        if (cleaned.length === 10) {
            cleaned = '91' + cleaned;
        }
        
        return '+' + cleaned;
    }

    // Log notification to database
    async logNotification(data) {
        try {
            await db.insert(`
                INSERT INTO notifications (
                    template_id, channel, recipient_phone, recipient_email,
                    subject, body, status, error_message, sent_at,
                    reference_type, reference_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                data.template_id,
                data.channel,
                data.recipient_phone,
                data.recipient_email,
                data.subject,
                data.body,
                data.status,
                data.error_message,
                data.status === 'sent' ? new Date() : null,
                data.reference_type,
                data.reference_id
            ]);
        } catch (error) {
            logger.error('Failed to log notification:', error);
        }
    }

    // Helper delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Get template by code
    async getTemplate(code) {
        return db.getOne(
            'SELECT * FROM notification_templates WHERE code = $1 AND is_active = true',
            [code]
        );
    }
}

module.exports = new NotificationService();
