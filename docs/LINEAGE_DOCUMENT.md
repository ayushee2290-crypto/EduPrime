# EduPrime - Feature Lineage Document

## Version 1.0.0 | January 2026

---

## Table of Contents
1. [Document Purpose](#document-purpose)
2. [System Overview](#system-overview)
3. [Feature-to-API-to-File Lineage Matrix](#feature-to-api-to-file-lineage-matrix)
4. [Detailed Feature Lineage](#detailed-feature-lineage)

---

## Document Purpose

This document provides complete traceability of each feature in the EduPrime system to its:
- **API Endpoints** - The REST API routes that power the feature
- **Route Files** - The Express.js route handlers
- **Model Files** - The data access layer
- **Service Files** - Business logic services
- **Frontend Files** - User interface components
- **Database Tables** - Underlying data storage

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           EDUPRIME FEATURE LINEAGE MAP                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

   FEATURE              →      API ENDPOINT       →      FILE PATH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Authentication       →      /api/auth/*        →      routes/auth.js
   MFA                  →      /api/mfa/*         →      routes/mfa.js
   Students             →      /api/students/*    →      routes/students.js
   Faculty              →      /api/faculty/*     →      routes/faculty.js
   Batches              →      /api/batches/*     →      routes/batches.js
   Fees                 →      /api/fees/*        →      routes/fees.js
   Attendance           →      /api/attendance/*  →      routes/attendance.js
   Exams                →      /api/exams/*       →      routes/exams.js
   Admissions           →      /api/admissions/*  →      routes/admissions.js
   Dashboard            →      /api/dashboard/*   →      routes/dashboard.js
   Notifications        →      /api/notifications →      routes/notifications.js
   Performance          →      /api/performance/* →      routes/performance.js
   Parent Portal        →      /api/parent/*      →      routes/parent.js
   Academic             →      /api/academic/*    →      routes/academic.js
```

---

## Feature-to-API-to-File Lineage Matrix

### Quick Reference Table

| # | Feature | API Base | Route File | Model File | Service File | Frontend | DB Tables |
|---|---------|----------|------------|------------|--------------|----------|-----------|
| 1 | Authentication | `/api/auth` | `routes/auth.js` | - | - | `index.html` | `users` |
| 2 | MFA | `/api/mfa` | `routes/mfa.js` | - | - | `index.html`, `mfa-setup.html` | `users` |
| 3 | Student Management | `/api/students` | `routes/students.js` | `models/Student.js` | - | `dashboard.html` | `students`, `student_batches` |
| 4 | Faculty Management | `/api/faculty` | `routes/faculty.js` | `models/Faculty.js` | - | `dashboard.html` | `faculty`, `faculty_batches` |
| 5 | Batch Management | `/api/batches` | `routes/batches.js` | `models/Batch.js` | - | `dashboard.html` | `batches`, `student_batches` |
| 6 | Fee Management | `/api/fees` | `routes/fees.js` | `models/Fee.js` | `feeReminderService.js` | `dashboard.html` | `student_fees`, `fee_payments`, `fee_installments` |
| 7 | Attendance | `/api/attendance` | `routes/attendance.js` | `models/Attendance.js` | `attendanceAlertService.js` | `dashboard.html` | `student_attendance`, `faculty_attendance` |
| 8 | Exams & Results | `/api/exams` | `routes/exams.js` | `models/Exam.js` | - | `dashboard.html` | `exams`, `results` |
| 9 | Admissions/Inquiries | `/api/admissions` | `routes/admissions.js` | `models/Inquiry.js` | - | `dashboard.html` | `inquiries` |
| 10 | Dashboard Analytics | `/api/dashboard` | `routes/dashboard.js` | - | `performanceAnalytics.js` | `dashboard.html` | Multiple views |
| 11 | Notifications | `/api/notifications` | `routes/notifications.js` | - | `notificationService.js` | `dashboard.html` | `notifications`, `notification_templates` |
| 12 | Performance Analytics | `/api/performance` | `routes/performance.js` | `models/Performance.js` | `performanceAnalytics.js` | `dashboard.html` | `results`, views |
| 13 | Parent Portal | `/api/parent` | `routes/parent.js` | - | - | `student-portal.html` | Multiple |
| 14 | Reports | `/api/reports` | - | - | `reportGenerator.js` | `dashboard.html` | Multiple |

---

## Detailed Feature Lineage

### 1. Authentication System

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FEATURE LINEAGE                                │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: User Authentication & Login
├── FRONTEND
│   ├── File: frontend/index.html
│   │   ├── Login Modal (Line: ~200-400)
│   │   ├── Role Tabs (Admin/Staff/Faculty)
│   │   └── MFA Verification Section
│   └── Functions:
│       ├── handleLogin()
│       ├── verifyMFA()
│       └── redirectToDashboard()
│
├── API ENDPOINTS
│   ├── POST /api/auth/login
│   │   ├── Purpose: Authenticate user credentials
│   │   ├── Request: { email, password }
│   │   └── Response: { token, user, requireMFA }
│   │
│   ├── POST /api/auth/register
│   │   ├── Purpose: Register new user
│   │   ├── Request: { email, password, role, ... }
│   │   └── Response: { userId, message }
│   │
│   ├── POST /api/auth/refresh
│   │   ├── Purpose: Refresh JWT token
│   │   └── Response: { newToken }
│   │
│   └── POST /api/auth/logout
│       └── Purpose: Invalidate session
│
├── BACKEND FILES
│   └── File: backend/routes/auth.js
│       ├── Dependencies:
│       │   ├── bcryptjs (password hashing)
│       │   ├── jsonwebtoken (JWT generation)
│       │   └── config/database.js (DB connection)
│       └── Functions:
│           ├── validateCredentials()
│           ├── generateToken()
│           └── hashPassword()
│
└── DATABASE
    └── Table: users
        ├── Columns: id, email, phone, password_hash, role, is_active
        ├── Columns: email_verified, phone_verified, last_login
        └── Related: All entity tables via user_id FK
```

---

### 2. Multi-Factor Authentication (MFA)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              MFA FEATURE LINEAGE                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Two-Factor Authentication
├── FRONTEND
│   ├── File: frontend/index.html
│   │   ├── MFA Section (hidden by default)
│   │   └── OTP Input Fields (6 digits)
│   │
│   └── File: frontend/mfa-setup.html
│       ├── QR Code Display
│       ├── Secret Key Display
│       └── Verification Test
│
├── API ENDPOINTS
│   ├── POST /api/mfa/setup
│   │   ├── Purpose: Generate MFA secret for user
│   │   └── Response: { secret, qrCode }
│   │
│   ├── POST /api/mfa/verify
│   │   ├── Purpose: Verify OTP code
│   │   ├── Request: { email, code }
│   │   └── Response: { token, user }
│   │
│   └── POST /api/mfa/disable
│       └── Purpose: Disable MFA for user
│
├── BACKEND FILES
│   └── File: backend/routes/mfa.js
│       ├── Dependencies:
│       │   ├── speakeasy (TOTP generation/verification)
│       │   └── qrcode (QR code generation)
│       └── Functions:
│           ├── generateSecret()
│           ├── verifyToken()
│           └── generateQRCode()
│
├── DOCUMENTATION
│   └── File: credentials/MFA_SETUP.md
│       └── Setup instructions and recovery
│
└── DATABASE
    └── Table: users
        └── Columns: mfa_secret, mfa_enabled
```

---

### 3. Student Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        STUDENT MANAGEMENT FEATURE LINEAGE                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Student CRUD Operations
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Students (showSection('students'))
│       ├── Components:
│       │   ├── Student List Table
│       │   ├── Add Student Modal
│       │   ├── Edit Student Modal
│       │   ├── Student Profile View
│       │   ├── Search & Filter Bar
│       │   └── Export Buttons
│       └── Functions:
│           ├── loadStudents()
│           ├── addStudent()
│           ├── editStudent()
│           ├── deleteStudent()
│           └── searchStudents()
│
├── API ENDPOINTS
│   ├── GET /api/students
│   │   ├── Purpose: List all students with filters
│   │   ├── Query: ?status=active&batch_id=1&search=name&limit=50&offset=0
│   │   └── Response: { students: [...], total, page }
│   │
│   ├── GET /api/students/:id
│   │   ├── Purpose: Get student details
│   │   └── Response: { student: {...}, batches, fees, attendance }
│   │
│   ├── POST /api/students
│   │   ├── Purpose: Create new student
│   │   ├── Request: { first_name, last_name, phone, email, ... }
│   │   └── Response: { studentId, enrollment_number }
│   │
│   ├── PUT /api/students/:id
│   │   ├── Purpose: Update student details
│   │   └── Request: { ...fieldsToUpdate }
│   │
│   ├── DELETE /api/students/:id
│   │   └── Purpose: Soft delete student
│   │
│   ├── GET /api/students/:id/performance
│   │   └── Purpose: Get student exam performance
│   │
│   ├── GET /api/students/:id/attendance
│   │   └── Purpose: Get student attendance records
│   │
│   └── GET /api/students/:id/fees
│       └── Purpose: Get student fee records
│
├── BACKEND FILES
│   ├── File: backend/routes/students.js
│   │   └── All student route handlers
│   │
│   └── File: backend/models/Student.js
│       └── Functions:
│           ├── findAll(filters)
│           ├── findById(id)
│           ├── create(data)
│           ├── update(id, data)
│           ├── delete(id)
│           ├── search(query)
│           ├── getPerformance(id)
│           ├── getAttendance(id, dateRange)
│           └── getFees(id)
│
├── TEST FILES
│   └── File: backend/__tests__/students.overview.test.js
│       └── Test cases for student API
│
└── DATABASE
    ├── Table: students
    │   ├── Primary Key: id (UUID)
    │   ├── Personal: first_name, last_name, date_of_birth, gender, photo_url
    │   ├── Contact: email, phone, alternate_phone, address, city, state, pincode
    │   ├── Academic: school_name, board, current_class, target_exam, target_year
    │   ├── Parent: father_name, father_phone, mother_name, mother_phone
    │   ├── Institute: enrollment_number, enrollment_date, status, counselor_id
    │   └── Metadata: notes, created_at, updated_at
    │
    ├── Table: student_batches
    │   ├── Purpose: Student-Batch enrollment (M:M)
    │   └── Columns: id, student_id, batch_id, enrollment_date, status, roll_number
    │
    └── Indexes:
        ├── idx_students_phone
        ├── idx_students_enrollment
        ├── idx_students_status
        └── idx_students_target_exam
```

---

### 4. Faculty Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         FACULTY MANAGEMENT FEATURE LINEAGE                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Faculty CRUD Operations
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Faculty
│       └── Components:
│           ├── Faculty List Table
│           ├── Add/Edit Faculty Modal
│           ├── Faculty Schedule View
│           └── Batch Assignment Interface
│
├── API ENDPOINTS
│   ├── GET /api/faculty
│   │   ├── Purpose: List all faculty
│   │   └── Query: ?status=active&subject=Physics
│   │
│   ├── GET /api/faculty/:id
│   │   └── Purpose: Get faculty details with batches
│   │
│   ├── POST /api/faculty
│   │   └── Request: { first_name, last_name, email, phone, specialization, ... }
│   │
│   ├── PUT /api/faculty/:id
│   │   └── Purpose: Update faculty details
│   │
│   ├── DELETE /api/faculty/:id
│   │   └── Purpose: Soft delete faculty
│   │
│   ├── GET /api/faculty/:id/batches
│   │   └── Purpose: Get assigned batches
│   │
│   └── GET /api/faculty/:id/schedule
│       └── Purpose: Get weekly schedule
│
├── BACKEND FILES
│   ├── File: backend/routes/faculty.js
│   │   └── All faculty route handlers
│   │
│   └── File: backend/models/Faculty.js
│       └── Functions:
│           ├── findAll(filters)
│           ├── findById(id)
│           ├── create(data)
│           ├── update(id, data)
│           ├── delete(id)
│           ├── getBatches(id)
│           └── getSchedule(id)
│
└── DATABASE
    ├── Table: faculty
    │   ├── Personal: first_name, last_name, email, phone, photo_url
    │   ├── Professional: employee_id, designation, department, specialization
    │   ├── Qualification: qualification, experience_years, subject_ids[]
    │   ├── Employment: joining_date, employment_type, salary
    │   └── Availability: available_days[], available_from, available_to
    │
    └── Table: faculty_batches
        ├── Purpose: Faculty-Batch assignment (M:M)
        └── Columns: faculty_id, batch_id, subject_id, is_primary, assigned_date
```

---

### 5. Batch Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          BATCH MANAGEMENT FEATURE LINEAGE                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Batch CRUD & Student Enrollment
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Batches
│       └── Components:
│           ├── Batch List/Cards View
│           ├── Create Batch Modal
│           ├── Batch Details View
│           ├── Student Enrollment Interface
│           └── Timetable View
│
├── API ENDPOINTS
│   ├── GET /api/batches
│   │   └── Query: ?status=active&faculty_id=1&course_id=1
│   │
│   ├── GET /api/batches/:id
│   │   └── Response: { batch, students, faculty, timetable }
│   │
│   ├── POST /api/batches
│   │   └── Request: { name, course_id, batch_type, schedule, max_students, fee }
│   │
│   ├── PUT /api/batches/:id
│   │
│   ├── DELETE /api/batches/:id
│   │
│   ├── GET /api/batches/:id/students
│   │   └── Purpose: Get enrolled students
│   │
│   ├── POST /api/batches/:id/students
│   │   └── Request: { student_id }
│   │   └── Purpose: Enroll student in batch
│   │
│   └── DELETE /api/batches/:id/students/:student_id
│       └── Purpose: Remove student from batch
│
├── BACKEND FILES
│   ├── File: backend/routes/batches.js
│   │
│   └── File: backend/models/Batch.js
│       └── Functions:
│           ├── findAll(filters)
│           ├── findById(id)
│           ├── create(data)
│           ├── update(id, data)
│           ├── delete(id)
│           ├── addStudent(batchId, studentId)
│           ├── removeStudent(batchId, studentId)
│           └── getStudents(batchId)
│
└── DATABASE
    ├── Table: batches
    │   ├── Basic: name, code, course_id, batch_type
    │   ├── Schedule: start_date, end_date, class_days[], start_time, end_time
    │   ├── Capacity: max_students, current_strength
    │   └── Financial: batch_fee, academic_year
    │
    ├── Table: courses
    │   └── Columns: name, code, course_type, description, duration_months, total_fee
    │
    └── Table: timetable
        └── Columns: batch_id, subject_id, faculty_id, day_of_week, times, room
```

---

### 6. Fee Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           FEE MANAGEMENT FEATURE LINEAGE                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Fee Collection & Reminders
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Fee Management
│       └── Components:
│           ├── Fee Collection Dashboard
│           ├── Pending Fees List
│           ├── Payment Recording Modal
│           ├── Receipt Generation
│           ├── Fee Reports
│           └── Send Reminder Button
│
├── API ENDPOINTS
│   ├── GET /api/fees
│   │   └── Query: ?status=pending&student_id=1&from_date=&to_date=
│   │
│   ├── GET /api/fees/:id
│   │
│   ├── POST /api/fees
│   │   └── Request: { student_id, fee_type, amount, due_date }
│   │
│   ├── PUT /api/fees/:id/pay
│   │   └── Request: { payment_method, transaction_id, amount }
│   │
│   ├── GET /api/fees/summary
│   │   └── Response: { total, collected, pending, overdue, collection_rate }
│   │
│   └── POST /api/fees/:id/remind
│       └── Request: { channel: 'whatsapp' }
│
├── BACKEND FILES
│   ├── File: backend/routes/fees.js
│   │   └── All fee route handlers
│   │
│   ├── File: backend/models/Fee.js
│   │   └── Functions:
│   │       ├── findAll(filters)
│   │       ├── findById(id)
│   │       ├── create(data)
│   │       ├── recordPayment(id, paymentData)
│   │       ├── getSummary(dateRange)
│   │       ├── getOverdue()
│   │       └── calculateLateFee(id)
│   │
│   └── File: backend/services/feeReminderService.js
│       └── Functions:
│           ├── checkDueFees()
│           ├── sendReminder(studentId, channel)
│           ├── scheduleReminders()
│           └── generateReport()
│
├── AUTOMATION
│   └── File: n8n-workflows/fee-reminders.json
│       └── Scheduled: Daily 8:00 AM
│       └── Actions: Query due fees → Format message → Send WhatsApp
│
└── DATABASE
    ├── Table: fee_structures
    │   └── Columns: course_id, batch_id, name, total_amount, installment config
    │
    ├── Table: student_fees
    │   ├── Amounts: total, discount, scholarship, net, paid, balance, late_fee
    │   └── Status: payment_status, due_date
    │
    ├── Table: fee_payments
    │   ├── Payment: amount, payment_mode, payment_date
    │   ├── Transaction: transaction_id, receipt_number, razorpay_ids
    │   └── Cheque: cheque_number, cheque_date, bank_name
    │
    ├── Table: fee_installments
    │   └── Columns: installment_number, amount, due_date, paid_date, status
    │
    ├── Trigger: generate_receipt_number
    │   └── Auto-generates: RCP{YEAR}{SEQUENCE}
    │
    └── Trigger: update_fee_on_payment
        └── Auto-updates: paid_amount, balance_amount, status
```

---

### 7. Attendance Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        ATTENDANCE MANAGEMENT FEATURE LINEAGE                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Attendance Marking & Alerts
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Attendance
│       └── Components:
│           ├── Batch Selection
│           ├── Student Attendance Grid
│           ├── Quick Mark (Present/Absent/Late)
│           ├── Attendance Summary Stats
│           ├── Low Attendance Warnings
│           └── Export Attendance Sheet
│
├── API ENDPOINTS
│   ├── GET /api/attendance
│   │   └── Query: ?batch_id=1&date=2025-01-15&student_id=1
│   │
│   ├── POST /api/attendance
│   │   └── Request: { student_id, batch_id, date, status, remarks }
│   │
│   ├── POST /api/attendance/bulk
│   │   └── Request: { batch_id, date, attendance: [{student_id, status}...] }
│   │
│   ├── GET /api/attendance/summary
│   │   └── Query: ?batch_id=1&from_date=&to_date=
│   │
│   └── GET /api/attendance/low-attendance
│       └── Query: ?threshold=75
│
├── BACKEND FILES
│   ├── File: backend/routes/attendance.js
│   │
│   ├── File: backend/models/Attendance.js
│   │   └── Functions:
│   │       ├── mark(data)
│   │       ├── markBulk(batchId, date, records)
│   │       ├── getSummary(filters)
│   │       ├── getLowAttendance(threshold)
│   │       └── getByDate(date, batchId)
│   │
│   └── File: backend/services/attendanceAlertService.js
│       └── Functions:
│           ├── notifyAbsent(studentId)
│           ├── parentAlert(parentPhone, studentName, date)
│           ├── checkLowAttendance()
│           └── dailyReport()
│
├── AUTOMATION
│   └── File: n8n-workflows/attendance-alerts.json
│       └── Scheduled: Daily 6:00 PM
│       └── Actions: Get absent → Get parent phones → Send alerts
│
└── DATABASE
    ├── Table: student_attendance
    │   ├── References: student_id, batch_id, subject_id, faculty_id
    │   ├── Status: attendance_date, status, check_in_time, check_out_time
    │   └── Metadata: marked_by, remarks
    │
    ├── Table: faculty_attendance
    │   ├── Status: attendance_date, status, check_in/out times
    │   └── Classes: classes_scheduled, classes_conducted
    │
    └── View: vw_attendance_summary
        └── Columns: student_id, name, batch, total_classes, present, absent, percentage
```

---

### 8. Exam & Results Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          EXAM MANAGEMENT FEATURE LINEAGE                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Exam Scheduling & Result Management
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Exams
│       └── Components:
│           ├── Exam Calendar View
│           ├── Schedule Exam Modal
│           ├── Exam Details View
│           ├── Result Entry Form
│           ├── Bulk Result Upload
│           ├── Result Analytics
│           └── Publish Results Button
│
├── API ENDPOINTS
│   ├── GET /api/exams
│   │   └── Query: ?batch_id=1&status=scheduled&exam_type=unit_test
│   │
│   ├── GET /api/exams/:id
│   │
│   ├── POST /api/exams
│   │   └── Request: { title, batch_id, subject_id, exam_type, date, marks, syllabus }
│   │
│   ├── PUT /api/exams/:id
│   │
│   ├── DELETE /api/exams/:id
│   │
│   ├── GET /api/exams/:id/results
│   │   └── Response: { results: [...], statistics: {...} }
│   │
│   ├── POST /api/exams/:id/results
│   │   └── Request: { student_id, marks_obtained, remarks }
│   │
│   ├── POST /api/exams/:id/results/bulk
│   │   └── Request: { results: [{student_id, marks}...] }
│   │
│   └── GET /api/exams/:id/analytics
│       └── Response: { topPerformers, topicAnalysis, distribution }
│
├── BACKEND FILES
│   ├── File: backend/routes/exams.js
│   │
│   └── File: backend/models/Exam.js
│       └── Functions:
│           ├── schedule(data)
│           ├── addResult(examId, studentId, marks)
│           ├── bulkAddResults(examId, results)
│           ├── publishResults(examId)
│           ├── getAnalytics(examId)
│           └── getRanks(examId)
│
└── DATABASE
    ├── Table: exams
    │   ├── Basic: name, code, exam_type, batch_ids[], subject_id
    │   ├── Schedule: exam_date, start_time, duration_minutes
    │   ├── Marks: total_marks, passing_marks, negative_marking
    │   └── Status: status, results_published, results_published_at
    │
    ├── Table: results
    │   ├── Scores: marks_obtained, total_marks, percentage
    │   ├── Ranking: rank_in_batch, rank_overall
    │   └── Analysis: question_analysis (JSONB), topic_analysis (JSONB)
    │
    └── View: vw_batch_performance
        └── Aggregates: students_appeared, avg_percentage, highest, lowest
```

---

### 9. Admission & Inquiry Management

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        ADMISSION MANAGEMENT FEATURE LINEAGE                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Inquiry Tracking & Conversion
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Inquiries
│       └── Components:
│           ├── Inquiry List/Kanban View
│           ├── Add Inquiry Modal
│           ├── Inquiry Details Panel
│           ├── Follow-up Scheduler
│           ├── Convert to Student Button
│           └── Inquiry Analytics
│
├── API ENDPOINTS
│   ├── GET /api/admissions/inquiries
│   │   └── Query: ?status=new&source=website&course_interest=JEE
│   │
│   ├── GET /api/admissions/inquiries/:id
│   │
│   ├── POST /api/admissions/inquiries
│   │   └── Request: { student_name, phone, parent_name, course_interest, source }
│   │
│   ├── PUT /api/admissions/inquiries/:id
│   │   └── Request: { status, follow_up_date, counselor_notes }
│   │
│   ├── POST /api/admissions/inquiries/:id/convert
│   │   └── Request: { batch_ids, admission_fee, tuition_fee }
│   │
│   └── GET /api/admissions/analytics
│       └── Response: { bySource, byStatus, conversionRate, trends }
│
├── BACKEND FILES
│   ├── File: backend/routes/admissions.js
│   │
│   └── File: backend/models/Inquiry.js
│       └── Functions:
│           ├── findAll(filters)
│           ├── create(data)
│           ├── update(id, data)
│           ├── convert(id, enrollmentData)
│           ├── scheduleFollowUp(id, date)
│           └── getAnalytics()
│
├── AUTOMATION
│   └── File: n8n-workflows/inquiry-followup.json
│       └── Scheduled: Daily 10:00 AM
│       └── Actions: Get pending inquiries → Check last contact → Send follow-up
│
└── DATABASE
    └── Table: inquiries
        ├── Contact: student_name, phone, email, parent_name, parent_phone
        ├── Academic: current_class, target_course, target_year
        ├── Source: source, referred_by, assigned_counselor_id
        ├── Status: status, follow_up_count, last_contact_date, next_follow_up_date
        ├── Conversion: converted_student_id, conversion_date, lost_reason
        └── History: interaction_history (JSONB)
```

---

### 10. Dashboard & Analytics

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         DASHBOARD ANALYTICS FEATURE LINEAGE                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Real-time Dashboard & Reports
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Dashboard (Home)
│       └── Components:
│           ├── Stats Cards (Students, Faculty, Revenue, Attendance)
│           ├── Revenue Chart (Line/Bar)
│           ├── Attendance Chart
│           ├── Recent Activities List
│           ├── Pending Tasks Widget
│           └── Quick Actions
│
├── API ENDPOINTS
│   ├── GET /api/dashboard/stats
│   │   └── Response: { totalStudents, activeFaculty, monthlyRevenue, avgAttendance }
│   │
│   ├── GET /api/dashboard/revenue
│   │   └── Query: ?period=monthly&months=6
│   │
│   ├── GET /api/dashboard/attendance
│   │   └── Query: ?batch_id=1&days=30
│   │
│   └── GET /api/dashboard/performance
│       └── Query: ?batch_id=1
│
├── BACKEND FILES
│   ├── File: backend/routes/dashboard.js
│   │
│   └── File: backend/services/performanceAnalytics.js
│       └── Functions:
│           ├── getOverviewStats()
│           ├── getRevenueAnalytics(period)
│           ├── getAttendanceTrends(filters)
│           └── getBatchPerformance(batchId)
│
└── DATABASE VIEWS
    ├── View: vw_student_fee_summary
    │   └── Aggregates fee data per student
    │
    ├── View: vw_attendance_summary
    │   └── Aggregates attendance percentages
    │
    ├── View: vw_batch_performance
    │   └── Aggregates exam performance per batch
    │
    └── View: vw_revenue_summary
        └── Aggregates payment collections by month
```

---

### 11. Notification System

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION SYSTEM FEATURE LINEAGE                          │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Multi-Channel Notifications
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Components:
│       │   ├── Send Notification Modal
│       │   ├── Template Selection
│       │   ├── Recipient Selection
│       │   └── Notification History
│
├── API ENDPOINTS
│   ├── POST /api/notifications/send
│   │   └── Request: { student_ids, channel, message, type }
│   │
│   ├── POST /api/notifications/bulk
│   │   └── Request: { batch_id, channel, message }
│   │
│   ├── GET /api/notifications
│   │   └── Query: ?student_id=1&type=fee_reminder
│   │
│   └── GET /api/notifications/templates
│       └── Response: { templates: [...] }
│
├── BACKEND FILES
│   ├── File: backend/routes/notifications.js
│   │
│   └── File: backend/services/notificationService.js
│       └── Functions:
│           ├── sendWhatsApp(phone, message)
│           ├── sendSMS(phone, message)
│           ├── sendEmail(email, subject, body)
│           ├── sendBulk(recipients, message)
│           ├── getTemplates()
│           └── processTemplate(templateCode, variables)
│
└── DATABASE
    ├── Table: notification_templates
    │   └── Columns: name, code, channel, subject, body, variables[]
    │
    └── Table: notifications
        ├── Recipient: recipient_type, recipient_id, phone, email
        ├── Content: channel, subject, body
        ├── Status: status, sent_at, delivered_at, read_at
        └── Reference: reference_type, reference_id
```

---

### 12. Reports Generation

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                         REPORTS GENERATION FEATURE LINEAGE                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

FEATURE: Custom Report Generation
├── FRONTEND
│   └── File: frontend/dashboard.html
│       ├── Section: Reports
│       └── Components:
│           ├── Report Type Selection
│           ├── Date Range Picker
│           ├── Filter Options
│           ├── Generate Button
│           └── Download (PDF/Excel)
│
├── API ENDPOINTS
│   ├── POST /api/reports/student/:id
│   │   └── Request: { format, include: ['attendance', 'fees', 'results'] }
│   │
│   ├── POST /api/reports/batch/:id
│   │   └── Request: { format }
│   │
│   ├── POST /api/reports/fees
│   │   └── Request: { from_date, to_date, status, format }
│   │
│   └── POST /api/reports/attendance
│       └── Request: { batch_id, month, year, format }
│
├── BACKEND FILES
│   └── File: backend/services/reportGenerator.js
│       └── Functions:
│           ├── studentReport(studentId, options)
│           ├── batchReport(batchId, options)
│           ├── feeReport(filters)
│           ├── attendanceReport(filters)
│           ├── exportPDF(data, template)
│           └── exportExcel(data, columns)
│
└── AUTOMATION
    └── File: n8n-workflows/daily-report.json
        └── Scheduled: Daily 9:00 PM
        └── Actions: Aggregate daily data → Generate report → Email to admin
```

---

## File Directory Reference

### Backend Structure
```
backend/
├── app.js                          # Express app factory
├── server.js                       # Entry point
├── package.json                    # Dependencies
├── Dockerfile                      # Container config
├── jest.config.js                  # Test configuration
├── seed.js                         # Database seeding
│
├── config/
│   ├── database.js                 # PostgreSQL connection
│   └── logger.js                   # Winston logger
│
├── routes/
│   ├── auth.js                     # Authentication routes
│   ├── mfa.js                      # MFA routes
│   ├── students.js                 # Student CRUD
│   ├── faculty.js                  # Faculty CRUD
│   ├── batches.js                  # Batch management
│   ├── fees.js                     # Fee management
│   ├── attendance.js               # Attendance
│   ├── exams.js                    # Exam management
│   ├── admissions.js               # Inquiry/Admission
│   ├── dashboard.js                # Dashboard stats
│   ├── notifications.js            # Notifications
│   ├── performance.js              # Performance analytics
│   ├── academic.js                 # Academic routes
│   └── parent.js                   # Parent portal
│
├── models/
│   ├── Student.js                  # Student data access
│   ├── Faculty.js                  # Faculty data access
│   ├── Batch.js                    # Batch data access
│   ├── Course.js                   # Course data access
│   ├── Fee.js                      # Fee data access
│   ├── Attendance.js               # Attendance data access
│   ├── Exam.js                     # Exam data access
│   ├── Inquiry.js                  # Inquiry data access
│   ├── Performance.js              # Performance data access
│   └── Syllabus.js                 # Syllabus data access
│
├── services/
│   ├── notificationService.js      # Notification handling
│   ├── feeReminderService.js       # Fee reminders
│   ├── attendanceAlertService.js   # Attendance alerts
│   ├── performanceAnalytics.js     # Performance analysis
│   └── reportGenerator.js          # Report generation
│
├── automation/
│   └── scheduledJobs.js            # Cron jobs
│
└── __tests__/
    └── students.overview.test.js   # Student API tests
```

### Frontend Structure
```
frontend/
├── index.html                      # Landing page with login
├── dashboard.html                  # Main dashboard
├── student-portal.html             # Student self-service
└── mfa-setup.html                  # MFA configuration
```

### Database Structure
```
database/
└── schema.sql                      # Complete database schema
```

### Documentation Structure
```
docs/
├── API_DOCUMENTATION.md            # API reference
├── SETUP_GUIDE.md                  # Installation guide
├── ARCHITECTURE_DIAGRAM.md         # System architecture
└── LINEAGE_DOCUMENT.md             # This document
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | EduPrime Team | Initial lineage documentation |

---

*This document is part of the EduPrime Institute Management System documentation.*
