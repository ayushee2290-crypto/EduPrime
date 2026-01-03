const db = require('../config/database');

class Fee {
    // Create student fee record
    static async create(data) {
        const query = `
            INSERT INTO student_fees (
                student_id, fee_structure_id, batch_id,
                total_amount, discount_amount, discount_reason,
                scholarship_amount, scholarship_name,
                net_amount, balance_amount,
                due_date, academic_year, status, notes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) RETURNING *
        `;
        
        const netAmount = data.total_amount - (data.discount_amount || 0) - (data.scholarship_amount || 0);
        
        const values = [
            data.student_id, data.fee_structure_id, data.batch_id,
            data.total_amount, data.discount_amount || 0, data.discount_reason,
            data.scholarship_amount || 0, data.scholarship_name,
            netAmount, netAmount,
            data.due_date, data.academic_year, 'pending', data.notes
        ];
        
        return db.insert(query, values);
    }

    // Find by ID
    static async findById(id) {
        const query = `
            SELECT sf.*, 
                   s.first_name || ' ' || s.last_name as student_name,
                   s.phone as student_phone,
                   s.father_name, s.father_phone,
                   b.name as batch_name
            FROM student_fees sf
            JOIN students s ON sf.student_id = s.id
            LEFT JOIN batches b ON sf.batch_id = b.id
            WHERE sf.id = $1
        `;
        return db.getOne(query, [id]);
    }

    // Get fees for a student
    static async findByStudent(studentId) {
        const query = `
            SELECT sf.*, b.name as batch_name
            FROM student_fees sf
            LEFT JOIN batches b ON sf.batch_id = b.id
            WHERE sf.student_id = $1
            ORDER BY sf.due_date DESC
        `;
        return db.getMany(query, [studentId]);
    }

    // Get all pending fees
    static async getPendingFees(filters = {}) {
        let query = `
            SELECT sf.*, 
                   s.first_name || ' ' || s.last_name as student_name,
                   s.phone as student_phone,
                   s.father_name, s.father_phone, s.father_email,
                   b.name as batch_name,
                   CURRENT_DATE - sf.due_date as days_overdue
            FROM student_fees sf
            JOIN students s ON sf.student_id = s.id
            LEFT JOIN batches b ON sf.batch_id = b.id
            WHERE sf.status IN ('pending', 'partial', 'overdue')
        `;
        const values = [];
        let paramCount = 0;

        if (filters.batch_id) {
            paramCount++;
            query += ` AND sf.batch_id = $${paramCount}`;
            values.push(filters.batch_id);
        }

        if (filters.days_overdue !== undefined) {
            paramCount++;
            query += ` AND (CURRENT_DATE - sf.due_date) >= $${paramCount}`;
            values.push(filters.days_overdue);
        }

        if (filters.due_in_days !== undefined) {
            paramCount++;
            query += ` AND sf.due_date <= CURRENT_DATE + $${paramCount}`;
            values.push(filters.due_in_days);
        }

        query += ' ORDER BY sf.due_date ASC, sf.balance_amount DESC';

        return db.getMany(query, values);
    }

    // Get fees due for reminder
    static async getFeesForReminder(daysBefore) {
        const query = `
            SELECT sf.*, 
                   s.first_name || ' ' || s.last_name as student_name,
                   s.phone as student_phone,
                   s.father_name, s.father_phone, s.email as student_email,
                   s.father_email,
                   b.name as batch_name
            FROM student_fees sf
            JOIN students s ON sf.student_id = s.id
            LEFT JOIN batches b ON sf.batch_id = b.id
            WHERE sf.status IN ('pending', 'partial')
            AND sf.due_date = CURRENT_DATE + INTERVAL '1 day' * $1
        `;
        return db.getMany(query, [daysBefore]);
    }

    // Get overdue fees
    static async getOverdueFees() {
        const query = `
            SELECT sf.*, 
                   s.first_name || ' ' || s.last_name as student_name,
                   s.phone as student_phone,
                   s.father_name, s.father_phone, s.father_email,
                   b.name as batch_name,
                   CURRENT_DATE - sf.due_date as days_overdue
            FROM student_fees sf
            JOIN students s ON sf.student_id = s.id
            LEFT JOIN batches b ON sf.batch_id = b.id
            WHERE sf.status IN ('pending', 'partial')
            AND sf.due_date < CURRENT_DATE
            ORDER BY days_overdue DESC
        `;
        return db.getMany(query);
    }

    // Record payment
    static async recordPayment(data) {
        return db.transaction(async (client) => {
            // Insert payment record
            const paymentResult = await client.query(`
                INSERT INTO fee_payments (
                    student_fee_id, student_id, amount, payment_mode, payment_date,
                    transaction_id, razorpay_payment_id, razorpay_order_id,
                    cheque_number, cheque_date, bank_name,
                    collected_by, notes, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'success')
                RETURNING *
            `, [
                data.student_fee_id, data.student_id, data.amount, data.payment_mode, data.payment_date || new Date(),
                data.transaction_id, data.razorpay_payment_id, data.razorpay_order_id,
                data.cheque_number, data.cheque_date, data.bank_name,
                data.collected_by, data.notes
            ]);

            // Get updated fee record
            const feeResult = await client.query(
                'SELECT * FROM student_fees WHERE id = $1',
                [data.student_fee_id]
            );

            return {
                payment: paymentResult.rows[0],
                fee: feeResult.rows[0]
            };
        });
    }

    // Get payment history
    static async getPaymentHistory(studentFeeId) {
        const query = `
            SELECT fp.*, u.email as collected_by_email
            FROM fee_payments fp
            LEFT JOIN users u ON fp.collected_by = u.id
            WHERE fp.student_fee_id = $1
            ORDER BY fp.payment_date DESC
        `;
        return db.getMany(query, [studentFeeId]);
    }

    // Get revenue summary
    static async getRevenueSummary(startDate, endDate) {
        const query = `
            SELECT 
                DATE_TRUNC('day', payment_date) as date,
                COUNT(*) as transaction_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END) as cash,
                SUM(CASE WHEN payment_mode = 'razorpay' THEN amount ELSE 0 END) as online,
                SUM(CASE WHEN payment_mode NOT IN ('cash', 'razorpay') THEN amount ELSE 0 END) as other
            FROM fee_payments
            WHERE status = 'success'
            AND payment_date BETWEEN $1 AND $2
            GROUP BY DATE_TRUNC('day', payment_date)
            ORDER BY date DESC
        `;
        return db.getMany(query, [startDate, endDate]);
    }

    // Get collection summary by batch
    static async getCollectionByBatch() {
        const query = `
            SELECT 
                b.id as batch_id,
                b.name as batch_name,
                COUNT(DISTINCT sf.student_id) as total_students,
                SUM(sf.net_amount) as total_fee,
                SUM(sf.paid_amount) as collected,
                SUM(sf.balance_amount) as pending,
                ROUND((SUM(sf.paid_amount) / NULLIF(SUM(sf.net_amount), 0)) * 100, 2) as collection_percentage
            FROM batches b
            LEFT JOIN student_fees sf ON b.id = sf.batch_id
            WHERE b.is_active = true
            GROUP BY b.id, b.name
            ORDER BY pending DESC
        `;
        return db.getMany(query);
    }

    // Apply late fee
    static async applyLateFee(studentFeeId, lateFeeAmount) {
        const query = `
            UPDATE student_fees
            SET late_fee = late_fee + $2,
                balance_amount = balance_amount + $2,
                status = 'overdue',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        return db.getOne(query, [studentFeeId, lateFeeAmount]);
    }

    // Update fee status
    static async updateStatus(id, status) {
        const query = `
            UPDATE student_fees
            SET status = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `;
        return db.getOne(query, [id, status]);
    }

    // Generate receipt data
    static async getReceiptData(paymentId) {
        const query = `
            SELECT 
                fp.*,
                sf.total_amount, sf.discount_amount, sf.scholarship_amount, sf.net_amount,
                sf.paid_amount as total_paid, sf.balance_amount,
                s.first_name || ' ' || s.last_name as student_name,
                s.enrollment_number, s.phone as student_phone,
                s.father_name,
                b.name as batch_name,
                c.name as course_name
            FROM fee_payments fp
            JOIN student_fees sf ON fp.student_fee_id = sf.id
            JOIN students s ON fp.student_id = s.id
            LEFT JOIN batches b ON sf.batch_id = b.id
            LEFT JOIN courses c ON b.course_id = c.id
            WHERE fp.id = $1
        `;
        return db.getOne(query, [paymentId]);
    }
}

module.exports = Fee;
