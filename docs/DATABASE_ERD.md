# EduPrime - Database Schema & ERD Documentation

## Version 1.0.0 | January 2026

---

## Table of Contents
1. [Entity Relationship Diagram (ERD)](#1-entity-relationship-diagram-erd)
2. [Table Relationships](#2-table-relationships)
3. [Detailed Schema Documentation](#3-detailed-schema-documentation)
4. [Data Dictionary](#4-data-dictionary)
5. [Indexes & Performance](#5-indexes--performance)
6. [Views & Functions](#6-views--functions)

---

## 1. Entity Relationship Diagram (ERD)

### 1.1 Complete ERD Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        EDUPRIME DATABASE - ENTITY RELATIONSHIP DIAGRAM               │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌─────────────┐
                                    │   USERS     │
                                    │─────────────│
                                    │ PK: id      │
                                    │ email       │
                                    │ phone       │
                                    │ password    │
                                    │ role        │
                                    └──────┬──────┘
                                           │
                     ┌─────────────────────┼─────────────────────┐
                     │                     │                     │
                     ▼                     ▼                     ▼
              ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
              │  STUDENTS   │       │  FACULTY    │       │ (COUNSELORS)│
              │─────────────│       │─────────────│       │             │
              │ PK: id      │       │ PK: id      │       └─────────────┘
              │ FK: user_id │       │ FK: user_id │
              │ first_name  │       │ first_name  │
              │ last_name   │       │ last_name   │
              │ phone       │       │ email       │
              │ status      │       │ subject_ids │
              └──────┬──────┘       └──────┬──────┘
                     │                     │
        ┌────────────┼────────────┐        │
        │            │            │        │
        ▼            ▼            ▼        ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────────┐
│STUDENT_FEES │ │STUDENT_ATTEND│ │ FACULTY_BATCHES  │
│─────────────│ │──────────────│ │──────────────────│
│ PK: id      │ │ PK: id       │ │ PK: id           │
│ FK:student  │ │ FK: student  │ │ FK: faculty_id   │
│ FK:batch    │ │ FK: batch    │ │ FK: batch_id     │
│ amount      │ │ date         │ │ FK: subject_id   │
│ status      │ │ status       │ │ is_primary       │
└──────┬──────┘ └──────┬───────┘ └────────┬─────────┘
       │               │                  │
       │               │                  │
       ▼               ▼                  ▼
┌─────────────┐ ┌─────────────┐    ┌─────────────┐
│FEE_PAYMENTS │ │  BATCHES    │◄───│  SUBJECTS   │
│─────────────│ │─────────────│    │─────────────│
│ PK: id      │ │ PK: id      │    │ PK: id      │
│ FK:student  │ │ FK: course  │    │ name        │
│ amount      │ │ name        │    │ code        │
│ mode        │ │ start_date  │    │ course_types│
│ receipt_no  │ │ max_students│    └─────────────┘
└─────────────┘ └──────┬──────┘
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
   ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
   │  COURSES    │ │STUDENT_BATCH│ │  TIMETABLE   │
   │─────────────│ │─────────────│ │──────────────│
   │ PK: id      │ │ PK: id      │ │ PK: id       │
   │ name        │ │ FK: student │ │ FK: batch_id │
   │ code        │ │ FK: batch   │ │ FK: subject  │
   │ course_type │ │ roll_number │ │ FK: faculty  │
   │ total_fee   │ │ status      │ │ day_of_week  │
   └─────────────┘ └─────────────┘ │ start_time   │
                                   └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EXAM & RESULT ENTITIES                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
   │   EXAMS     │           │  RESULTS    │           │  SYLLABUS   │
   │─────────────│           │─────────────│           │  _TOPICS    │
   │ PK: id      │◄──────────│ PK: id      │           │─────────────│
   │ name        │           │ FK: exam_id │           │ PK: id      │
   │ exam_type   │           │ FK: student │           │ FK: subject │
   │ batch_ids[] │           │ marks       │           │ chapter     │
   │ subject_id  │           │ percentage  │           │ topic_name  │
   │ total_marks │           │ rank        │           │ difficulty  │
   │ exam_date   │           │ topic_anal. │           └──────┬──────┘
   └─────────────┘           └─────────────┘                  │
                                                              ▼
                                                      ┌──────────────┐
                                                      │SYLLABUS_PROG │
                                                      │──────────────│
                                                      │ PK: id       │
                                                      │ FK: batch    │
                                                      │ FK: topic    │
                                                      │ FK: faculty  │
                                                      │ status       │
                                                      └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            FEE MANAGEMENT ENTITIES                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

   ┌───────────────┐         ┌─────────────┐         ┌───────────────┐
   │FEE_STRUCTURES │◄────────│STUDENT_FEES │────────▶│ FEE_PAYMENTS  │
   │───────────────│         │─────────────│         │───────────────│
   │ PK: id        │         │ PK: id      │         │ PK: id        │
   │ FK: course    │         │ FK: student │         │ FK: stud_fee  │
   │ FK: batch     │         │ FK:fee_struc│         │ FK: student   │
   │ total_amount  │         │ total_amt   │         │ amount        │
   │ installments  │         │ net_amount  │         │ payment_mode  │
   │ discounts     │         │ paid_amount │         │ receipt_no    │
   └───────────────┘         │ balance     │         │ transaction_id│
                             └──────┬──────┘         └───────────────┘
                                    │
                                    ▼
                             ┌──────────────┐
                             │FEE_INSTALLMNT│
                             │──────────────│
                             │ PK: id       │
                             │ FK: stud_fee │
                             │ installment# │
                             │ amount       │
                             │ due_date     │
                             │ status       │
                             └──────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            INQUIRY & NOTIFICATION ENTITIES                           │
└─────────────────────────────────────────────────────────────────────────────────────┘

   ┌─────────────┐                              ┌───────────────────┐
   │  INQUIRIES  │                              │NOTIF_TEMPLATES    │
   │─────────────│                              │───────────────────│
   │ PK: id      │                              │ PK: id            │
   │ student_name│                              │ name              │
   │ phone       │                              │ code              │
   │ target_cours│         ┌─────────────┐     │ channel           │
   │ source      │         │NOTIFICATIONS│     │ body              │
   │ status      │────────▶│─────────────│◄────│ variables[]       │
   │ counselor_id│         │ PK: id      │     └───────────────────┘
   │ converted_id│         │ FK: template│
   └─────────────┘         │ recipient_id│     ┌───────────────────┐
                           │ channel     │     │ ANNOUNCEMENTS     │
                           │ status      │     │───────────────────│
                           │ sent_at     │     │ PK: id            │
                           └─────────────┘     │ title             │
                                               │ content           │
                                               │ target_audience[] │
                                               │ batch_ids[]       │
                                               │ channels[]        │
                                               └───────────────────┘
```

### 1.2 Simplified ERD (Core Entities)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           SIMPLIFIED CORE ENTITY DIAGRAM                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    USERS     │
                              │   (Auth)     │
                              └──────┬───────┘
                                     │ 1
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
               ▼ 1                   ▼ 1                   ▼ 0..1
        ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
        │   STUDENTS   │      │   FACULTY    │      │  COUNSELORS  │
        └──────┬───────┘      └──────┬───────┘      └──────────────┘
               │                     │
               │ M                   │ M
               │                     │
               ▼                     ▼
        ┌──────────────┐      ┌──────────────┐
        │STUDENT_BATCH │──────│FACULTY_BATCH │
        │   (M:M)      │      │    (M:M)     │
        └──────┬───────┘      └──────┬───────┘
               │                     │
               │ M                   │ M
               │                     │
               └────────┬────────────┘
                        │
                        ▼ 1
                 ┌──────────────┐
                 │   BATCHES    │
                 └──────┬───────┘
                        │ M
                        │
                        ▼ 1
                 ┌──────────────┐
                 │   COURSES    │
                 └──────────────┘

RELATIONSHIPS:
═══════════════
• User → Student     : 1:1 (Optional - students may not have user account)
• User → Faculty     : 1:1 (All faculty have user accounts)
• Student → Batch    : M:M (Through student_batches)
• Faculty → Batch    : M:M (Through faculty_batches)
• Batch → Course     : M:1 (Each batch belongs to one course)
• Student → Fees     : 1:M (One student, many fee records)
• Student → Attend   : 1:M (One student, many attendance records)
• Exam → Results     : 1:M (One exam, many results)
```

---

## 2. Table Relationships

### 2.1 Relationship Matrix

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           TABLE RELATIONSHIP MATRIX                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

                  users students faculty batches courses subjects exams results fees
users              -     1:0..1   1:0..1    -       -        -      -      -      -
students         0..1:1    -       -      M:M     -        -      -     1:M    1:M
faculty          0..1:1    -       -      M:M     -       M:M     -      -      -
batches            -      M:M     M:M      -      M:1      -      -      -     1:M
courses            -       -       -      1:M      -       -      -      -      -
subjects           -       -      M:M      -       -       -     0..1    -      -
exams              -       -       -       -       -     1:0..1   -     1:M     -
results            -      M:1      -       -       -       -     M:1     -      -
fees               -      M:1      -      M:1      -       -      -      -      -

LEGEND:
1:1   = One-to-One
1:M   = One-to-Many
M:1   = Many-to-One
M:M   = Many-to-Many
0..1  = Optional
-     = No direct relationship
```

### 2.2 Foreign Key Relationships

```sql
-- CORE RELATIONSHIPS
students.user_id          → users.id           (Optional)
faculty.user_id           → users.id           (Optional)
batches.course_id         → courses.id         (Required)

-- JUNCTION TABLES (M:M)
student_batches.student_id → students.id
student_batches.batch_id   → batches.id

faculty_batches.faculty_id → faculty.id
faculty_batches.batch_id   → batches.id
faculty_batches.subject_id → subjects.id

-- FEE RELATIONSHIPS
student_fees.student_id      → students.id
student_fees.fee_structure_id → fee_structures.id
student_fees.batch_id        → batches.id

fee_payments.student_fee_id  → student_fees.id
fee_payments.student_id      → students.id
fee_payments.collected_by    → users.id

fee_installments.student_fee_id → student_fees.id
fee_installments.payment_id     → fee_payments.id

-- ATTENDANCE RELATIONSHIPS
student_attendance.student_id → students.id
student_attendance.batch_id   → batches.id
student_attendance.subject_id → subjects.id
student_attendance.faculty_id → faculty.id
student_attendance.marked_by  → users.id

faculty_attendance.faculty_id → faculty.id
faculty_attendance.marked_by  → users.id

-- EXAM RELATIONSHIPS
exams.subject_id    → subjects.id
exams.created_by    → users.id

results.exam_id     → exams.id
results.student_id  → students.id
results.evaluated_by → users.id

-- SYLLABUS RELATIONSHIPS
syllabus_topics.subject_id  → subjects.id
syllabus_progress.batch_id  → batches.id
syllabus_progress.topic_id  → syllabus_topics.id
syllabus_progress.faculty_id → faculty.id

-- INQUIRY RELATIONSHIPS
inquiries.assigned_counselor_id → users.id
inquiries.converted_student_id  → students.id

-- NOTIFICATION RELATIONSHIPS
notifications.template_id → notification_templates.id

-- TIMETABLE RELATIONSHIPS
timetable.batch_id   → batches.id
timetable.subject_id → subjects.id
timetable.faculty_id → faculty.id
```

---

## 3. Detailed Schema Documentation

### 3.1 Core Tables

#### USERS Table
```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  TABLE: users                                                                       │
│  Purpose: Authentication and authorization for all system users                     │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ Column          │ Type          │ Nullable │ Default │ Description           │  │
│  ├─────────────────┼───────────────┼──────────┼─────────┼───────────────────────┤  │
│  │ id              │ UUID          │ NO       │ uuid()  │ Primary Key           │  │
│  │ email           │ VARCHAR(255)  │ NO       │         │ Unique email          │  │
│  │ phone           │ VARCHAR(15)   │ NO       │         │ Unique phone          │  │
│  │ password_hash   │ VARCHAR(255)  │ NO       │         │ Bcrypt hash           │  │
│  │ role            │ user_role     │ NO       │ student │ ENUM: admin,manager,  │  │
│  │                 │               │          │         │ faculty,student,parent│  │
│  │ is_active       │ BOOLEAN       │ YES      │ true    │ Account status        │  │
│  │ email_verified  │ BOOLEAN       │ YES      │ false   │ Email verified?       │  │
│  │ phone_verified  │ BOOLEAN       │ YES      │ false   │ Phone verified?       │  │
│  │ last_login      │ TIMESTAMPTZ   │ YES      │         │ Last login time       │  │
│  │ created_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Creation timestamp    │  │
│  │ updated_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Update timestamp      │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  Indexes:                                                                           │
│  • PRIMARY KEY (id)                                                                 │
│  • UNIQUE (email)                                                                   │
│  • UNIQUE (phone)                                                                   │
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

#### STUDENTS Table
```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  TABLE: students                                                                    │
│  Purpose: Store all student information                                             │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  PERSONAL INFORMATION                                                               │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ Column          │ Type          │ Nullable │ Default │ Description           │  │
│  ├─────────────────┼───────────────┼──────────┼─────────┼───────────────────────┤  │
│  │ id              │ UUID          │ NO       │ uuid()  │ Primary Key           │  │
│  │ user_id         │ UUID          │ YES      │         │ FK → users.id         │  │
│  │ first_name      │ VARCHAR(100)  │ NO       │         │ Student first name    │  │
│  │ last_name       │ VARCHAR(100)  │ NO       │         │ Student last name     │  │
│  │ date_of_birth   │ DATE          │ YES      │         │ Date of birth         │  │
│  │ gender          │ VARCHAR(10)   │ YES      │         │ Gender                │  │
│  │ photo_url       │ VARCHAR(500)  │ YES      │         │ Profile photo URL     │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  CONTACT INFORMATION                                                                │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ email           │ VARCHAR(255)  │ YES      │         │ Student email         │  │
│  │ phone           │ VARCHAR(15)   │ NO       │         │ Primary phone         │  │
│  │ alternate_phone │ VARCHAR(15)   │ YES      │         │ Alternate phone       │  │
│  │ address         │ TEXT          │ YES      │         │ Full address          │  │
│  │ city            │ VARCHAR(100)  │ YES      │         │ City                  │  │
│  │ state           │ VARCHAR(100)  │ YES      │         │ State                 │  │
│  │ pincode         │ VARCHAR(10)   │ YES      │         │ PIN code              │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  ACADEMIC INFORMATION                                                               │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ school_name     │ VARCHAR(255)  │ YES      │         │ Current school        │  │
│  │ board           │ VARCHAR(50)   │ YES      │         │ CBSE/ICSE/State       │  │
│  │ current_class   │ VARCHAR(20)   │ YES      │         │ Current class         │  │
│  │ target_exam     │ course_type   │ YES      │         │ Target exam (ENUM)    │  │
│  │ target_year     │ INTEGER       │ YES      │         │ Target year           │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  PARENT/GUARDIAN INFORMATION                                                        │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ father_name     │ VARCHAR(200)  │ YES      │         │ Father's name         │  │
│  │ father_phone    │ VARCHAR(15)   │ YES      │         │ Father's phone        │  │
│  │ father_email    │ VARCHAR(255)  │ YES      │         │ Father's email        │  │
│  │ father_occupation│VARCHAR(100)  │ YES      │         │ Father's occupation   │  │
│  │ mother_name     │ VARCHAR(200)  │ YES      │         │ Mother's name         │  │
│  │ mother_phone    │ VARCHAR(15)   │ YES      │         │ Mother's phone        │  │
│  │ mother_email    │ VARCHAR(255)  │ YES      │         │ Mother's email        │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  INSTITUTE INFORMATION                                                              │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ enrollment_no   │ VARCHAR(50)   │ YES      │         │ Auto-generated: EP..  │  │
│  │ enrollment_date │ DATE          │ YES      │         │ Date of enrollment    │  │
│  │ status          │ student_status│ YES      │ inquiry │ ENUM: inquiry,enrolled│  │
│  │ referred_by     │ VARCHAR(200)  │ YES      │         │ Referral source       │  │
│  │ counselor_id    │ UUID          │ YES      │         │ Assigned counselor    │  │
│  │ notes           │ TEXT          │ YES      │         │ Additional notes      │  │
│  │ created_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Creation time         │  │
│  │ updated_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Update time           │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  Indexes:                                                                           │
│  • PRIMARY KEY (id)                                                                 │
│  • UNIQUE (enrollment_number)                                                       │
│  • INDEX (phone) - for quick lookup                                                 │
│  • INDEX (status) - for filtering                                                   │
│  • INDEX (target_exam) - for course filtering                                       │
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

#### BATCHES Table
```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  TABLE: batches                                                                     │
│  Purpose: Define class batches with schedules                                       │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ Column          │ Type          │ Nullable │ Default │ Description           │  │
│  ├─────────────────┼───────────────┼──────────┼─────────┼───────────────────────┤  │
│  │ id              │ UUID          │ NO       │ uuid()  │ Primary Key           │  │
│  │ name            │ VARCHAR(100)  │ NO       │         │ Batch name            │  │
│  │ code            │ VARCHAR(50)   │ NO       │         │ Unique batch code     │  │
│  │ course_id       │ UUID          │ YES      │         │ FK → courses.id       │  │
│  │ batch_type      │ batch_type    │ YES      │ regular │ ENUM: regular,weekend │  │
│  │ start_date      │ DATE          │ NO       │         │ Batch start date      │  │
│  │ end_date        │ DATE          │ YES      │         │ Batch end date        │  │
│  │ class_days      │ VARCHAR(50)[] │ YES      │         │ Array of weekdays     │  │
│  │ start_time      │ TIME          │ YES      │         │ Class start time      │  │
│  │ end_time        │ TIME          │ YES      │         │ Class end time        │  │
│  │ max_students    │ INTEGER       │ YES      │ 50      │ Max capacity          │  │
│  │ current_strength│ INTEGER       │ YES      │ 0       │ Current enrollment    │  │
│  │ batch_fee       │ DECIMAL(10,2) │ YES      │         │ Batch fee amount      │  │
│  │ is_active       │ BOOLEAN       │ YES      │ true    │ Active status         │  │
│  │ academic_year   │ VARCHAR(10)   │ YES      │         │ Academic year         │  │
│  │ created_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Creation time         │  │
│  │ updated_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Update time           │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  Indexes:                                                                           │
│  • PRIMARY KEY (id)                                                                 │
│  • UNIQUE (code)                                                                    │
│                                                                                     │
│  Triggers:                                                                          │
│  • update_batch_strength - Auto-updates current_strength on student enrollment     │
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Junction Tables (Many-to-Many)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  TABLE: student_batches                                                             │
│  Purpose: Link students to batches (M:M relationship)                               │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ Column          │ Type          │ Nullable │ Default │ Description           │  │
│  ├─────────────────┼───────────────┼──────────┼─────────┼───────────────────────┤  │
│  │ id              │ UUID          │ NO       │ uuid()  │ Primary Key           │  │
│  │ student_id      │ UUID          │ NO       │         │ FK → students.id      │  │
│  │ batch_id        │ UUID          │ NO       │         │ FK → batches.id       │  │
│  │ enrollment_date │ DATE          │ YES      │ today   │ Enrollment date       │  │
│  │ status          │ VARCHAR(20)   │ YES      │ active  │ active/completed/drop │  │
│  │ roll_number     │ VARCHAR(20)   │ YES      │         │ Roll number in batch  │  │
│  │ created_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Creation time         │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  Constraints:                                                                       │
│  • UNIQUE (student_id, batch_id) - Prevent duplicate enrollments                   │
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────┐
│  TABLE: faculty_batches                                                             │
│  Purpose: Link faculty to batches with subject assignment                           │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  ┌─────────────────┬───────────────┬──────────┬─────────┬───────────────────────┐  │
│  │ Column          │ Type          │ Nullable │ Default │ Description           │  │
│  ├─────────────────┼───────────────┼──────────┼─────────┼───────────────────────┤  │
│  │ id              │ UUID          │ NO       │ uuid()  │ Primary Key           │  │
│  │ faculty_id      │ UUID          │ NO       │         │ FK → faculty.id       │  │
│  │ batch_id        │ UUID          │ NO       │         │ FK → batches.id       │  │
│  │ subject_id      │ UUID          │ YES      │         │ FK → subjects.id      │  │
│  │ is_primary      │ BOOLEAN       │ YES      │ true    │ Primary teacher?      │  │
│  │ assigned_date   │ DATE          │ YES      │ today   │ Assignment date       │  │
│  │ created_at      │ TIMESTAMPTZ   │ YES      │ now()   │ Creation time         │  │
│  └─────────────────┴───────────────┴──────────┴─────────┴───────────────────────┘  │
│                                                                                     │
│  Constraints:                                                                       │
│  • UNIQUE (faculty_id, batch_id, subject_id)                                       │
│                                                                                     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Dictionary

### 4.1 ENUM Types

```sql
-- User Roles
CREATE TYPE user_role AS ENUM (
    'admin',      -- Full system access
    'manager',    -- Institute management
    'faculty',    -- Teaching staff
    'student',    -- Student access
    'parent',     -- Parent portal access
    'counselor',  -- Inquiry handling
    'accountant'  -- Fee management
);

-- Student Status
CREATE TYPE student_status AS ENUM (
    'inquiry',    -- Initial inquiry stage
    'enrolled',   -- Enrolled but not active
    'active',     -- Currently studying
    'inactive',   -- Temporarily inactive
    'passed_out', -- Completed course
    'dropped'     -- Left institute
);

-- Course Types
CREATE TYPE course_type AS ENUM (
    'class_9',        -- Class 9 Foundation
    'class_10',       -- Class 10 Foundation
    'class_11',       -- Class 11
    'class_12',       -- Class 12
    'class_12_pass',  -- Dropper batch
    'iit_jee',        -- IIT-JEE Preparation
    'neet',           -- NEET Preparation
    'foundation'      -- Foundation courses
);

-- Batch Types
CREATE TYPE batch_type AS ENUM (
    'regular',        -- Regular weekday batch
    'weekend',        -- Weekend only
    'crash_course',   -- Short-term intensive
    'doubt_clearing', -- Doubt sessions
    'revision'        -- Revision batches
);

-- Payment Status
CREATE TYPE payment_status AS ENUM (
    'pending',  -- Not paid
    'partial',  -- Partially paid
    'paid',     -- Fully paid
    'overdue',  -- Past due date
    'waived'    -- Fee waived
);

-- Payment Mode
CREATE TYPE payment_mode AS ENUM (
    'cash',       -- Cash payment
    'upi',        -- UPI transfer
    'card',       -- Credit/Debit card
    'netbanking', -- Net banking
    'cheque',     -- Cheque
    'razorpay',   -- Online via Razorpay
    'other'       -- Other modes
);

-- Attendance Status
CREATE TYPE attendance_status AS ENUM (
    'present',  -- Present in class
    'absent',   -- Absent
    'late',     -- Came late
    'half_day', -- Half day present
    'leave',    -- On approved leave
    'holiday'   -- Holiday
);

-- Exam Types
CREATE TYPE exam_type AS ENUM (
    'weekly_test',   -- Weekly tests
    'monthly_test',  -- Monthly tests
    'unit_test',     -- Unit/Chapter tests
    'mock_exam',     -- Full mock exams
    'practice_test', -- Practice tests
    'final_exam'     -- Final exams
);

-- Notification Channels
CREATE TYPE notification_channel AS ENUM (
    'sms',       -- SMS
    'whatsapp',  -- WhatsApp
    'email',     -- Email
    'push',      -- Push notification
    'in_app'     -- In-app notification
);

-- Notification Status
CREATE TYPE notification_status AS ENUM (
    'pending',   -- Queued for sending
    'sent',      -- Sent successfully
    'delivered', -- Delivered to recipient
    'failed',    -- Failed to send
    'read'       -- Read by recipient
);

-- Inquiry Status
CREATE TYPE inquiry_status AS ENUM (
    'new',            -- New inquiry
    'contacted',      -- Initial contact made
    'follow_up',      -- Under follow-up
    'demo_scheduled', -- Demo class scheduled
    'converted',      -- Converted to student
    'lost'            -- Lost lead
);
```

### 4.2 Sample Data Examples

```sql
-- Sample User
INSERT INTO users (email, phone, password_hash, role) VALUES
('admin@eduprime.edu', '9876500000', '$2b$10$...', 'admin');

-- Sample Student
INSERT INTO students (
    first_name, last_name, phone, email,
    school_name, board, current_class, target_exam,
    father_name, father_phone, status
) VALUES (
    'Rahul', 'Sharma', '9876543210', 'rahul@email.com',
    'DPS Sector 45', 'CBSE', '12', 'iit_jee',
    'Suresh Sharma', '9876543211', 'active'
);

-- Sample Batch
INSERT INTO batches (
    name, code, course_id, batch_type,
    start_date, class_days, start_time, end_time,
    max_students, batch_fee
) VALUES (
    'JEE-2026 Morning', 'JEE2026-M', '<course_uuid>',
    'regular', '2025-01-15',
    ARRAY['Monday', 'Wednesday', 'Friday'],
    '09:00', '11:00', 35, 150000
);

-- Sample Fee Record
INSERT INTO student_fees (
    student_id, batch_id, total_amount, discount_amount,
    net_amount, paid_amount, balance_amount, due_date
) VALUES (
    '<student_uuid>', '<batch_uuid>', 150000, 15000,
    135000, 50000, 85000, '2025-02-01'
);
```

---

## 5. Indexes & Performance

### 5.1 Index Summary

```sql
-- PRIMARY KEYS (Automatically indexed)
-- All tables have UUID primary keys

-- UNIQUE INDEXES
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE UNIQUE INDEX idx_users_phone ON users(phone);
CREATE UNIQUE INDEX idx_students_enrollment ON students(enrollment_number);
CREATE UNIQUE INDEX idx_batches_code ON batches(code);
CREATE UNIQUE INDEX idx_faculty_employee_id ON faculty(employee_id);
CREATE UNIQUE INDEX idx_fee_payments_receipt ON fee_payments(receipt_number);

-- SEARCH INDEXES
CREATE INDEX idx_students_phone ON students(phone);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_target_exam ON students(target_exam);

-- FOREIGN KEY INDEXES
CREATE INDEX idx_student_fees_student ON student_fees(student_id);
CREATE INDEX idx_student_fees_status ON student_fees(status);
CREATE INDEX idx_student_fees_due_date ON student_fees(due_date);
CREATE INDEX idx_fee_payments_student ON fee_payments(student_id);
CREATE INDEX idx_fee_payments_date ON fee_payments(payment_date);
CREATE INDEX idx_student_attendance_date ON student_attendance(attendance_date);
CREATE INDEX idx_student_attendance_student ON student_attendance(student_id);
CREATE INDEX idx_results_exam ON results(exam_id);
CREATE INDEX idx_results_student ON results(student_id);
CREATE INDEX idx_inquiries_phone ON inquiries(phone);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- COMPOSITE INDEXES (for common queries)
CREATE INDEX idx_attendance_student_batch_date 
ON student_attendance(student_id, batch_id, attendance_date);

CREATE INDEX idx_fees_student_status 
ON student_fees(student_id, status);
```

### 5.2 Query Performance Tips

```sql
-- Optimized Query: Get students with pending fees
SELECT s.*, sf.balance_amount, sf.due_date
FROM students s
INNER JOIN student_fees sf ON s.id = sf.student_id
WHERE sf.status IN ('pending', 'partial', 'overdue')
  AND sf.balance_amount > 0
ORDER BY sf.due_date;

-- Use EXPLAIN ANALYZE to check query plans
EXPLAIN ANALYZE SELECT * FROM students WHERE status = 'active';

-- Optimize with partial indexes for common queries
CREATE INDEX idx_active_students ON students(id) WHERE status = 'active';
CREATE INDEX idx_pending_fees ON student_fees(student_id, due_date) 
WHERE status IN ('pending', 'partial');
```

---

## 6. Views & Functions

### 6.1 Database Views

```sql
-- VIEW: Student Fee Summary
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

-- VIEW: Attendance Summary
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

-- VIEW: Batch Performance
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

-- VIEW: Revenue Summary
CREATE OR REPLACE VIEW vw_revenue_summary AS
SELECT 
    DATE_TRUNC('month', fp.payment_date) AS month,
    COUNT(DISTINCT fp.student_id) AS unique_payers,
    COUNT(fp.id) AS total_transactions,
    SUM(fp.amount) AS total_collected,
    SUM(CASE WHEN fp.payment_mode = 'razorpay' THEN fp.amount ELSE 0 END) AS online_collection,
    SUM(CASE WHEN fp.payment_mode = 'cash' THEN fp.amount ELSE 0 END) AS cash_collection
FROM fee_payments fp
WHERE fp.status = 'success'
GROUP BY DATE_TRUNC('month', fp.payment_date)
ORDER BY month DESC;
```

### 6.2 Database Functions & Triggers

```sql
-- FUNCTION: Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- FUNCTION: Generate enrollment number
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

-- FUNCTION: Generate receipt number
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

-- FUNCTION: Update batch strength
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

-- FUNCTION: Update fee balance after payment
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

-- TRIGGERS
CREATE TRIGGER update_students_updated_at 
    BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER generate_student_enrollment
    BEFORE INSERT ON students
    FOR EACH ROW
    WHEN (NEW.enrollment_number IS NULL AND NEW.status = 'enrolled')
    EXECUTE FUNCTION generate_enrollment_number();

CREATE TRIGGER generate_payment_receipt
    BEFORE INSERT ON fee_payments
    FOR EACH ROW
    WHEN (NEW.receipt_number IS NULL)
    EXECUTE FUNCTION generate_receipt_number();

CREATE TRIGGER maintain_batch_strength
    AFTER INSERT OR DELETE ON student_batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_strength();

CREATE TRIGGER update_fee_on_payment
    AFTER INSERT ON fee_payments
    FOR EACH ROW
    WHEN (NEW.status = 'success')
    EXECUTE FUNCTION update_fee_balance();
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | EduPrime Team | Initial database documentation |

---

*This document is part of the EduPrime Institute Management System documentation.*
