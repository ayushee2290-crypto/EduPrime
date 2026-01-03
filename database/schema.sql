-- ===========================================
-- EduPrime Coaching Institute Database Schema
-- Version: 1.0.0
-- Date: January 2026
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- ENUM TYPES
-- ===========================================

-- User roles
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'faculty', 'student', 'parent', 'counselor', 'accountant');

-- Student status
CREATE TYPE student_status AS ENUM ('inquiry', 'enrolled', 'active', 'inactive', 'passed_out', 'dropped');

-- Course types
CREATE TYPE course_type AS ENUM ('class_9', 'class_10', 'class_11', 'class_12', 'class_12_pass', 'iit_jee', 'neet', 'foundation');

-- Batch types
CREATE TYPE batch_type AS ENUM ('regular', 'weekend', 'crash_course', 'doubt_clearing', 'revision');

-- Payment status
CREATE TYPE payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue', 'waived');

-- Payment mode
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'card', 'netbanking', 'cheque', 'razorpay', 'other');

-- Attendance status
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'half_day', 'leave', 'holiday');

-- Exam types
CREATE TYPE exam_type AS ENUM ('weekly_test', 'monthly_test', 'unit_test', 'mock_exam', 'practice_test', 'final_exam');

-- Notification channels
CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'email', 'push', 'in_app');

-- Notification status
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- Inquiry status
CREATE TYPE inquiry_status AS ENUM ('new', 'contacted', 'follow_up', 'demo_scheduled', 'converted', 'lost');

-- ===========================================
-- CORE TABLES
-- ===========================================

-- Users table (authentication & authorization)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- STUDENT MANAGEMENT TABLES
-- ===========================================

-- Students table
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(10),
    photo_url VARCHAR(500),
    
    -- Contact Information
    email VARCHAR(255),
    phone VARCHAR(15) NOT NULL,
    alternate_phone VARCHAR(15),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    
    -- Academic Information
    school_name VARCHAR(255),
    board VARCHAR(50), -- CBSE, ICSE, State Board
    current_class VARCHAR(20),
    target_exam course_type,
    target_year INTEGER,
    
    -- Parent/Guardian Information
    father_name VARCHAR(200),
    father_phone VARCHAR(15),
    father_email VARCHAR(255),
    father_occupation VARCHAR(100),
    mother_name VARCHAR(200),
    mother_phone VARCHAR(15),
    mother_email VARCHAR(255),
    
    -- Institute Information
    enrollment_number VARCHAR(50) UNIQUE,
    enrollment_date DATE,
    status student_status DEFAULT 'inquiry',
    referred_by VARCHAR(200),
    counselor_id UUID,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster searches
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_enrollment ON students(enrollment_number);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_target_exam ON students(target_exam);

-- ===========================================
-- COURSE & BATCH MANAGEMENT
-- ===========================================

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    course_type course_type NOT NULL,
    description TEXT,
    duration_months INTEGER,
    total_fee DECIMAL(10, 2) NOT NULL,
    syllabus JSONB, -- Detailed syllabus structure
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    course_types course_type[], -- Array of applicable course types
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default subjects
INSERT INTO subjects (name, code, course_types) VALUES
('Physics', 'PHY', ARRAY['class_11', 'class_12', 'iit_jee', 'neet']::course_type[]),
('Chemistry', 'CHE', ARRAY['class_11', 'class_12', 'iit_jee', 'neet']::course_type[]),
('Mathematics', 'MAT', ARRAY['class_9', 'class_10', 'class_11', 'class_12', 'iit_jee']::course_type[]),
('Biology', 'BIO', ARRAY['class_11', 'class_12', 'neet']::course_type[]),
('English', 'ENG', ARRAY['class_9', 'class_10', 'class_11', 'class_12']::course_type[]),
('Science', 'SCI', ARRAY['class_9', 'class_10']::course_type[]),
('Social Studies', 'SST', ARRAY['class_9', 'class_10']::course_type[]);

-- Batches table
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    course_id UUID REFERENCES courses(id),
    batch_type batch_type DEFAULT 'regular',
    
    -- Schedule
    start_date DATE NOT NULL,
    end_date DATE,
    class_days VARCHAR(50)[], -- ['Monday', 'Wednesday', 'Friday']
    start_time TIME,
    end_time TIME,
    
    -- Capacity
    max_students INTEGER DEFAULT 50,
    current_strength INTEGER DEFAULT 0,
    
    -- Fees
    batch_fee DECIMAL(10, 2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    academic_year VARCHAR(10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student-Batch enrollment (Many-to-Many)
CREATE TABLE student_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, transferred, dropped
    roll_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, batch_id)
);

-- ===========================================
-- FACULTY MANAGEMENT
-- ===========================================

-- Faculty table
CREATE TABLE faculty (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    alternate_phone VARCHAR(15),
    photo_url VARCHAR(500),
    
    -- Professional Information
    employee_id VARCHAR(50) UNIQUE,
    designation VARCHAR(100),
    department VARCHAR(100),
    specialization VARCHAR(200),
    qualification VARCHAR(500),
    experience_years INTEGER,
    
    -- Subjects they teach
    subject_ids UUID[],
    
    -- Employment
    joining_date DATE,
    employment_type VARCHAR(50), -- full_time, part_time, visiting
    salary DECIMAL(10, 2),
    
    -- Availability
    available_days VARCHAR(20)[],
    available_from TIME,
    available_to TIME,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Faculty-Batch assignment
CREATE TABLE faculty_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID REFERENCES faculty(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    is_primary BOOLEAN DEFAULT true,
    assigned_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(faculty_id, batch_id, subject_id)
);

-- ===========================================
-- TIMETABLE MANAGEMENT
-- ===========================================

-- Timetable entries
CREATE TABLE timetable (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id),
    faculty_id UUID REFERENCES faculty(id),
    
    day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    room_number VARCHAR(20),
    
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- FEE MANAGEMENT
-- ===========================================

-- Fee structure
CREATE TABLE fee_structures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id),
    batch_id UUID REFERENCES batches(id),
    name VARCHAR(200) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Installment configuration
    installment_allowed BOOLEAN DEFAULT true,
    max_installments INTEGER DEFAULT 4,
    installment_amounts JSONB, -- [{"installment": 1, "amount": 25000, "due_days": 0}, ...]
    
    -- Discounts
    early_bird_discount DECIMAL(5, 2) DEFAULT 0,
    sibling_discount DECIMAL(5, 2) DEFAULT 0,
    merit_discount DECIMAL(5, 2) DEFAULT 0,
    
    -- Late fees
    late_fee_percentage DECIMAL(5, 2) DEFAULT 2,
    grace_period_days INTEGER DEFAULT 7,
    
    academic_year VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student fees (individual fee records)
CREATE TABLE student_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID REFERENCES fee_structures(id),
    batch_id UUID REFERENCES batches(id),
    
    -- Amounts
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    discount_reason VARCHAR(200),
    scholarship_amount DECIMAL(10, 2) DEFAULT 0,
    scholarship_name VARCHAR(200),
    net_amount DECIMAL(10, 2) NOT NULL,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    balance_amount DECIMAL(10, 2) NOT NULL,
    late_fee DECIMAL(10, 2) DEFAULT 0,
    
    -- Status
    status payment_status DEFAULT 'pending',
    
    -- Dates
    due_date DATE,
    academic_year VARCHAR(10),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fee payments (transaction records)
CREATE TABLE fee_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id),
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    payment_mode payment_mode NOT NULL,
    payment_date DATE DEFAULT CURRENT_DATE,
    
    -- Transaction details
    transaction_id VARCHAR(100),
    receipt_number VARCHAR(50) UNIQUE,
    razorpay_payment_id VARCHAR(100),
    razorpay_order_id VARCHAR(100),
    
    -- Cheque details (if applicable)
    cheque_number VARCHAR(50),
    cheque_date DATE,
    bank_name VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'success', -- success, failed, refunded
    
    -- Collected by
    collected_by UUID REFERENCES users(id),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Fee installments tracking
CREATE TABLE fee_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_fee_id UUID REFERENCES student_fees(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    status payment_status DEFAULT 'pending',
    payment_id UUID REFERENCES fee_payments(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ATTENDANCE MANAGEMENT
-- ===========================================

-- Student attendance
CREATE TABLE student_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id),
    subject_id UUID REFERENCES subjects(id),
    faculty_id UUID REFERENCES faculty(id),
    
    attendance_date DATE NOT NULL,
    status attendance_status NOT NULL,
    
    -- Timing
    check_in_time TIME,
    check_out_time TIME,
    
    -- Additional info
    marked_by UUID REFERENCES users(id),
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(student_id, batch_id, subject_id, attendance_date)
);

-- Faculty attendance
CREATE TABLE faculty_attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID REFERENCES faculty(id) ON DELETE CASCADE,
    
    attendance_date DATE NOT NULL,
    status attendance_status NOT NULL,
    
    check_in_time TIME,
    check_out_time TIME,
    
    -- Classes conducted
    classes_scheduled INTEGER DEFAULT 0,
    classes_conducted INTEGER DEFAULT 0,
    
    marked_by UUID REFERENCES users(id),
    remarks TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(faculty_id, attendance_date)
);

-- ===========================================
-- EXAM & RESULT MANAGEMENT
-- ===========================================

-- Exams table
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE,
    exam_type exam_type NOT NULL,
    
    -- Associated entities
    batch_ids UUID[],
    subject_id UUID REFERENCES subjects(id),
    course_type course_type,
    
    -- Schedule
    exam_date DATE NOT NULL,
    start_time TIME,
    duration_minutes INTEGER,
    
    -- Marks configuration
    total_marks DECIMAL(6, 2) NOT NULL,
    passing_marks DECIMAL(6, 2),
    negative_marking BOOLEAN DEFAULT false,
    negative_marks_value DECIMAL(4, 2),
    
    -- Syllabus
    syllabus_topics TEXT[],
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, ongoing, completed, cancelled
    results_published BOOLEAN DEFAULT false,
    results_published_at TIMESTAMP WITH TIME ZONE,
    
    instructions TEXT,
    created_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Results table
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    
    -- Marks
    marks_obtained DECIMAL(6, 2),
    total_marks DECIMAL(6, 2),
    percentage DECIMAL(5, 2),
    
    -- Ranking
    rank_in_batch INTEGER,
    rank_overall INTEGER,
    
    -- Question-wise analysis (for detailed analytics)
    question_analysis JSONB, -- [{"q_no": 1, "correct": true, "marks": 4, "topic": "Mechanics"}, ...]
    
    -- Topic-wise analysis
    topic_analysis JSONB, -- {"Mechanics": {"total": 20, "scored": 16}, ...}
    
    -- Status
    status VARCHAR(20) DEFAULT 'evaluated', -- pending, evaluated, published
    is_absent BOOLEAN DEFAULT false,
    
    remarks TEXT,
    evaluated_by UUID REFERENCES users(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(exam_id, student_id)
);

-- ===========================================
-- SYLLABUS TRACKING
-- ===========================================

-- Syllabus topics
CREATE TABLE syllabus_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID REFERENCES subjects(id),
    course_type course_type,
    
    chapter_number INTEGER,
    chapter_name VARCHAR(200) NOT NULL,
    topic_name VARCHAR(300) NOT NULL,
    
    estimated_hours DECIMAL(4, 1),
    difficulty_level VARCHAR(20), -- easy, medium, hard
    weightage_percentage DECIMAL(4, 1), -- Exam weightage
    
    sequence_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Syllabus completion tracking
CREATE TABLE syllabus_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES batches(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES syllabus_topics(id),
    faculty_id UUID REFERENCES faculty(id),
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed
    completion_date DATE,
    hours_spent DECIMAL(4, 1),
    
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(batch_id, topic_id)
);

-- ===========================================
-- ADMISSION & INQUIRY MANAGEMENT
-- ===========================================

-- Inquiries table
CREATE TABLE inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Contact Information
    student_name VARCHAR(200) NOT NULL,
    phone VARCHAR(15) NOT NULL,
    alternate_phone VARCHAR(15),
    email VARCHAR(255),
    
    -- Parent Information
    parent_name VARCHAR(200),
    parent_phone VARCHAR(15),
    
    -- Academic Interest
    current_class VARCHAR(20),
    target_course course_type,
    target_year INTEGER,
    
    -- Inquiry Details
    source VARCHAR(100), -- website, walk_in, referral, social_media, advertisement
    referred_by VARCHAR(200),
    
    -- Status tracking
    status inquiry_status DEFAULT 'new',
    assigned_counselor_id UUID REFERENCES users(id),
    
    -- Follow-up
    last_contact_date TIMESTAMP WITH TIME ZONE,
    next_follow_up_date TIMESTAMP WITH TIME ZONE,
    follow_up_count INTEGER DEFAULT 0,
    
    -- Conversion
    converted_student_id UUID REFERENCES students(id),
    conversion_date DATE,
    lost_reason VARCHAR(300),
    
    -- Notes
    notes TEXT,
    interaction_history JSONB, -- Array of interaction logs
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inquiries_phone ON inquiries(phone);
CREATE INDEX idx_inquiries_status ON inquiries(status);

-- ===========================================
-- NOTIFICATION SYSTEM
-- ===========================================

-- Notification templates
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    channel notification_channel NOT NULL,
    
    -- Template content
    subject VARCHAR(300), -- For email
    body TEXT NOT NULL,
    
    -- Variables used
    variables VARCHAR(50)[], -- ['student_name', 'amount', 'due_date']
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default templates
INSERT INTO notification_templates (name, code, channel, subject, body, variables) VALUES
('Fee Reminder - 7 Days', 'FEE_REMIND_7', 'whatsapp', NULL, 
 'Dear {{parent_name}}, this is a reminder that fee of ₹{{amount}} for {{student_name}} is due on {{due_date}}. Please make the payment to avoid late fees. - EduPrime Institute',
 ARRAY['parent_name', 'student_name', 'amount', 'due_date']),

('Fee Reminder - Due Today', 'FEE_REMIND_0', 'whatsapp', NULL,
 'Dear {{parent_name}}, fee of ₹{{amount}} for {{student_name}} is due TODAY. Please make the payment immediately. Pay online: {{payment_link}} - EduPrime Institute',
 ARRAY['parent_name', 'student_name', 'amount', 'payment_link']),

('Fee Overdue', 'FEE_OVERDUE', 'whatsapp', NULL,
 'Dear {{parent_name}}, fee of ₹{{amount}} for {{student_name}} is OVERDUE by {{days}} days. Late fee of ₹{{late_fee}} has been applied. Please pay immediately. - EduPrime Institute',
 ARRAY['parent_name', 'student_name', 'amount', 'days', 'late_fee']),

('Attendance Alert', 'ATTENDANCE_ABSENT', 'whatsapp', NULL,
 'Dear {{parent_name}}, your ward {{student_name}} was marked ABSENT today ({{date}}) in {{batch_name}}. If this is incorrect, please contact the institute. - EduPrime Institute',
 ARRAY['parent_name', 'student_name', 'date', 'batch_name']),

('Low Attendance Warning', 'ATTENDANCE_LOW', 'whatsapp', NULL,
 'Dear {{parent_name}}, attendance of {{student_name}} is {{percentage}}% which is below the required 75%. Please ensure regular attendance. - EduPrime Institute',
 ARRAY['parent_name', 'student_name', 'percentage']),

('Result Published', 'RESULT_PUBLISHED', 'whatsapp', NULL,
 'Dear {{parent_name}}, results for {{exam_name}} have been published. {{student_name}} scored {{marks}}/{{total}} ({{percentage}}%). Rank: {{rank}}. Keep up the good work! - EduPrime Institute',
 ARRAY['parent_name', 'student_name', 'exam_name', 'marks', 'total', 'percentage', 'rank']),

('Admission Inquiry Response', 'INQUIRY_RESPONSE', 'whatsapp', NULL,
 'Thank you for your interest in EduPrime Institute! We offer {{course_name}} with expert faculty and proven results. Fee: ₹{{fee}}. Visit us or call {{phone}} for a FREE counseling session. - EduPrime',
 ARRAY['course_name', 'fee', 'phone']);

-- Notification logs
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID REFERENCES notification_templates(id),
    
    -- Recipients
    recipient_type VARCHAR(20), -- student, parent, faculty
    recipient_id UUID,
    recipient_phone VARCHAR(15),
    recipient_email VARCHAR(255),
    
    -- Content
    channel notification_channel NOT NULL,
    subject VARCHAR(300),
    body TEXT NOT NULL,
    
    -- Status
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Reference
    reference_type VARCHAR(50), -- fee_reminder, attendance_alert, result_notification
    reference_id UUID,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ANNOUNCEMENTS & BROADCASTS
-- ===========================================

CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(300) NOT NULL,
    content TEXT NOT NULL,
    
    -- Targeting
    target_audience VARCHAR(50)[], -- ['all', 'students', 'parents', 'faculty', 'batch:uuid']
    batch_ids UUID[],
    course_types course_type[],
    
    -- Channels
    channels notification_channel[],
    
    -- Schedule
    publish_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expire_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_published BOOLEAN DEFAULT false,
    is_urgent BOOLEAN DEFAULT false,
    
    -- Attachments
    attachment_urls TEXT[],
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===========================================
-- ANALYTICS & REPORTING VIEWS
-- ===========================================

-- View: Student Fee Summary
CREATE OR REPLACE VIEW vw_student_fee_summary AS
SELECT 
    s.id AS student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    s.phone,
    s.enrollment_number,
    sf.total_amount,
    sf.discount_amount,
    sf.scholarship_amount,
    sf.net_amount,
    sf.paid_amount,
    sf.balance_amount,
    sf.late_fee,
    sf.status AS payment_status,
    sf.due_date,
    sf.academic_year,
    b.name AS batch_name
FROM students s
JOIN student_fees sf ON s.id = sf.student_id
LEFT JOIN batches b ON sf.batch_id = b.id;

-- View: Attendance Summary
CREATE OR REPLACE VIEW vw_attendance_summary AS
SELECT 
    s.id AS student_id,
    s.first_name || ' ' || s.last_name AS student_name,
    s.phone,
    b.name AS batch_name,
    COUNT(*) AS total_classes,
    SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END) AS present_count,
    SUM(CASE WHEN sa.status = 'absent' THEN 1 ELSE 0 END) AS absent_count,
    ROUND(
        (SUM(CASE WHEN sa.status = 'present' THEN 1 ELSE 0 END)::DECIMAL / 
        NULLIF(COUNT(*), 0)) * 100, 2
    ) AS attendance_percentage
FROM students s
JOIN student_batches sb ON s.id = sb.student_id
JOIN batches b ON sb.batch_id = b.id
LEFT JOIN student_attendance sa ON s.id = sa.student_id AND b.id = sa.batch_id
GROUP BY s.id, s.first_name, s.last_name, s.phone, b.name;

-- View: Batch Performance
CREATE OR REPLACE VIEW vw_batch_performance AS
SELECT 
    b.id AS batch_id,
    b.name AS batch_name,
    b.course_id,
    e.id AS exam_id,
    e.name AS exam_name,
    e.exam_type,
    COUNT(r.id) AS students_appeared,
    ROUND(AVG(r.percentage), 2) AS average_percentage,
    MAX(r.percentage) AS highest_percentage,
    MIN(r.percentage) AS lowest_percentage,
    SUM(CASE WHEN r.percentage >= 90 THEN 1 ELSE 0 END) AS above_90,
    SUM(CASE WHEN r.percentage >= 75 AND r.percentage < 90 THEN 1 ELSE 0 END) AS between_75_90,
    SUM(CASE WHEN r.percentage >= 50 AND r.percentage < 75 THEN 1 ELSE 0 END) AS between_50_75,
    SUM(CASE WHEN r.percentage < 50 THEN 1 ELSE 0 END) AS below_50
FROM batches b
JOIN exams e ON b.id = ANY(e.batch_ids)
LEFT JOIN results r ON e.id = r.exam_id
GROUP BY b.id, b.name, b.course_id, e.id, e.name, e.exam_type;

-- View: Revenue Summary
CREATE OR REPLACE VIEW vw_revenue_summary AS
SELECT 
    DATE_TRUNC('month', fp.payment_date) AS month,
    COUNT(DISTINCT fp.student_id) AS unique_payers,
    COUNT(fp.id) AS total_transactions,
    SUM(fp.amount) AS total_collected,
    SUM(CASE WHEN fp.payment_mode = 'razorpay' THEN fp.amount ELSE 0 END) AS online_collection,
    SUM(CASE WHEN fp.payment_mode = 'cash' THEN fp.amount ELSE 0 END) AS cash_collection,
    SUM(CASE WHEN fp.payment_mode NOT IN ('razorpay', 'cash') THEN fp.amount ELSE 0 END) AS other_collection
FROM fee_payments fp
WHERE fp.status = 'success'
GROUP BY DATE_TRUNC('month', fp.payment_date)
ORDER BY month DESC;

-- ===========================================
-- FUNCTIONS & TRIGGERS
-- ===========================================

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all relevant tables
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faculty_updated_at BEFORE UPDATE ON faculty
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_fees_updated_at BEFORE UPDATE ON student_fees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate enrollment number
CREATE OR REPLACE FUNCTION generate_enrollment_number()
RETURNS TRIGGER AS $$
DECLARE
    year_code VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_code := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(enrollment_number FROM 8) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM students
    WHERE enrollment_number LIKE 'EP' || year_code || '%';
    
    NEW.enrollment_number := 'EP' || year_code || LPAD(sequence_num::TEXT, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_student_enrollment
    BEFORE INSERT ON students
    FOR EACH ROW
    WHEN (NEW.enrollment_number IS NULL AND NEW.status = 'enrolled')
    EXECUTE FUNCTION generate_enrollment_number();

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
DECLARE
    year_code VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_code := TO_CHAR(CURRENT_DATE, 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM fee_payments
    WHERE receipt_number LIKE 'RCP' || year_code || '%';
    
    NEW.receipt_number := 'RCP' || year_code || LPAD(sequence_num::TEXT, 6, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_payment_receipt
    BEFORE INSERT ON fee_payments
    FOR EACH ROW
    WHEN (NEW.receipt_number IS NULL)
    EXECUTE FUNCTION generate_receipt_number();

-- Function to update batch strength
CREATE OR REPLACE FUNCTION update_batch_strength()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE batches SET current_strength = current_strength + 1 WHERE id = NEW.batch_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE batches SET current_strength = current_strength - 1 WHERE id = OLD.batch_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintain_batch_strength
    AFTER INSERT OR DELETE ON student_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_strength();

-- Function to update fee balance
CREATE OR REPLACE FUNCTION update_fee_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE student_fees 
    SET 
        paid_amount = paid_amount + NEW.amount,
        balance_amount = net_amount + late_fee - (paid_amount + NEW.amount),
        status = CASE 
            WHEN (net_amount + late_fee - (paid_amount + NEW.amount)) <= 0 THEN 'paid'::payment_status
            WHEN (paid_amount + NEW.amount) > 0 THEN 'partial'::payment_status
            ELSE status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.student_fee_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fee_on_payment
    AFTER INSERT ON fee_payments
    FOR EACH ROW
    WHEN (NEW.status = 'success')
    EXECUTE FUNCTION update_fee_balance();

-- ===========================================
-- SAMPLE DATA FOR TESTING
-- ===========================================

-- Insert sample courses
INSERT INTO courses (name, code, course_type, description, duration_months, total_fee) VALUES
('Class 9 Foundation', 'C9F', 'class_9', 'Foundation course for Class 9 students', 12, 45000),
('Class 10 Foundation', 'C10F', 'class_10', 'Foundation course for Class 10 with Board preparation', 12, 50000),
('Class 11 Science (PCM)', 'C11PCM', 'class_11', 'Class 11 PCM with IIT-JEE Foundation', 12, 75000),
('Class 11 Science (PCB)', 'C11PCB', 'class_11', 'Class 11 PCB with NEET Foundation', 12, 75000),
('Class 12 Science (PCM)', 'C12PCM', 'class_12', 'Class 12 PCM with IIT-JEE Advanced', 12, 85000),
('Class 12 Science (PCB)', 'C12PCB', 'class_12', 'Class 12 PCB with NEET Intensive', 12, 85000),
('IIT-JEE Comprehensive', 'IITJEE', 'iit_jee', '2-Year IIT-JEE Preparation Program', 24, 200000),
('NEET Comprehensive', 'NEET', 'neet', '2-Year NEET Preparation Program', 24, 180000),
('IIT-JEE Dropper Batch', 'IITDROP', 'class_12_pass', 'One-year intensive for 12th pass IIT aspirants', 12, 125000),
('NEET Dropper Batch', 'NEETDROP', 'class_12_pass', 'One-year intensive for 12th pass NEET aspirants', 12, 110000);

-- ===========================================
-- INDEXES FOR PERFORMANCE
-- ===========================================

CREATE INDEX idx_student_fees_student_id ON student_fees(student_id);
CREATE INDEX idx_student_fees_status ON student_fees(status);
CREATE INDEX idx_student_fees_due_date ON student_fees(due_date);
CREATE INDEX idx_fee_payments_student_id ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX idx_student_attendance_date ON student_attendance(attendance_date);
CREATE INDEX idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX idx_results_exam_id ON results(exam_id);
CREATE INDEX idx_results_student_id ON results(student_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ===========================================
-- GRANTS (Adjust based on your user setup)
-- ===========================================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO eduprime_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO eduprime_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO eduprime_user;

-- ===========================================
-- END OF SCHEMA
-- ===========================================
