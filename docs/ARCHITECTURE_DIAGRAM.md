# EduPrime - System Architecture Documentation

## Version 1.0.0 | January 2026

---

## Table of Contents
1. [High-Level Design (HLD)](#1-high-level-design-hld)
2. [Low-Level Design (LLD)](#2-low-level-design-lld)
3. [Component Architecture](#3-component-architecture)
4. [Data Flow Architecture](#4-data-flow-architecture)
5. [Security Architecture](#5-security-architecture)
6. [Integration Architecture](#6-integration-architecture)

---

## 1. High-Level Design (HLD)

### 1.1 System Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              EDUPRIME INSTITUTE MANAGEMENT SYSTEM                     │
│                                    HIGH-LEVEL ARCHITECTURE                            │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────────┐
                                    │   USERS/CLIENTS  │
                                    └────────┬─────────┘
                                             │
        ┌────────────────┬───────────────────┼───────────────────┬────────────────┐
        │                │                   │                   │                │
        ▼                ▼                   ▼                   ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐
│    ADMIN     │ │    STAFF     │ │     FACULTY      │ │   STUDENTS   │ │   PARENTS    │
│   (Browser)  │ │   (Browser)  │ │    (Browser)     │ │   (Portal)   │ │   (Mobile)   │
└──────┬───────┘ └──────┬───────┘ └────────┬─────────┘ └──────┬───────┘ └──────┬───────┘
       │                │                  │                  │                │
       └────────────────┴──────────────────┴──────────────────┴────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────┐
                    │              LOAD BALANCER               │
                    │           (NGINX / Cloud LB)             │
                    └────────────────────┬─────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                                     │
├────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │   Landing Page   │  │    Dashboard     │  │  Student Portal  │                  │
│  │   (index.html)   │  │ (dashboard.html) │  │(student-portal)  │                  │
│  │                  │  │                  │  │                  │                  │
│  │ • Login Form     │  │ • Analytics      │  │ • View Results   │                  │
│  │ • MFA Auth       │  │ • Management     │  │ • Attendance     │                  │
│  │ • Role Selection │  │ • Reports        │  │ • Fee Status     │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                  │
└────────────────────────────────────────────┬───────────────────────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                                      │
│                           (Node.js / Express.js)                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │   AUTH      │  │  STUDENTS   │  │   FACULTY   │  │   BATCHES   │               │
│   │   MODULE    │  │   MODULE    │  │   MODULE    │  │   MODULE    │               │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │    FEES     │  │ ATTENDANCE  │  │    EXAMS    │  │ ADMISSIONS  │               │
│   │   MODULE    │  │   MODULE    │  │   MODULE    │  │   MODULE    │               │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │ DASHBOARD   │  │NOTIFICATION │  │   REPORTS   │  │ PERFORMANCE │               │
│   │   MODULE    │  │   MODULE    │  │   MODULE    │  │   MODULE    │               │
│   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘               │
│                                                                                     │
└────────────────────────────────────────────┬───────────────────────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER                                          │
├────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │  Notification    │  │   Fee Reminder   │  │   Attendance     │                  │
│  │    Service       │  │    Service       │  │  Alert Service   │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                  │
│  ┌──────────────────┐  ┌──────────────────┐                                        │
│  │   Performance    │  │     Report       │                                        │
│  │   Analytics      │  │   Generator      │                                        │
│  └──────────────────┘  └──────────────────┘                                        │
└────────────────────────────────────────────┬───────────────────────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                                DATA LAYER                                           │
├────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                  │
│  │   PostgreSQL     │  │     Redis        │  │  File Storage    │                  │
│  │    Database      │  │     Cache        │  │   (uploads/)     │                  │
│  │                  │  │                  │  │                  │                  │
│  │ • Users          │  │ • Sessions       │  │ • Documents      │                  │
│  │ • Students       │  │ • Tokens         │  │ • Photos         │                  │
│  │ • Faculty        │  │ • Rate Limits    │  │ • Reports        │                  │
│  │ • Batches        │  │                  │  │                  │                  │
│  │ • Fees           │  │                  │  │                  │                  │
│  │ • Attendance     │  │                  │  │                  │                  │
│  │ • Exams          │  │                  │  │                  │                  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                  │
└────────────────────────────────────────────┬───────────────────────────────────────┘
                                             │
                                             ▼
┌────────────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL INTEGRATIONS                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Razorpay   │  │   WhatsApp   │  │    Email     │  │     n8n      │            │
│  │   Payment    │  │  Business    │  │   Service    │  │  Automation  │            │
│  │   Gateway    │  │     API      │  │   (SMTP)     │  │  Workflows   │            │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘            │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 HLD Component Description

| Layer | Component | Description | Technology |
|-------|-----------|-------------|------------|
| **Presentation** | Landing Page | User authentication & role-based login | HTML5, CSS3, Bootstrap 5 |
| **Presentation** | Dashboard | Admin/Staff management interface | HTML5, JavaScript |
| **Presentation** | Student Portal | Student self-service portal | HTML5, JavaScript |
| **Application** | API Server | RESTful API handling all business logic | Node.js, Express.js |
| **Service** | Background Services | Automated notifications, reminders | Node-cron, n8n |
| **Data** | Primary Database | All transactional data | PostgreSQL 15+ |
| **Data** | Cache Layer | Session management, rate limiting | Redis (Optional) |
| **Integration** | Payment Gateway | Online fee collection | Razorpay |
| **Integration** | Communication | Student/Parent notifications | WhatsApp, Email, SMS |

---

## 2. Low-Level Design (LLD)

### 2.1 Module Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           LOW-LEVEL DESIGN - MODULE BREAKDOWN                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                  ROUTES LAYER                                         │
│                            /backend/routes/*.js                                       │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   │
│  │   auth.js      │   │  students.js   │   │  faculty.js    │   │  batches.js    │   │
│  │                │   │                │   │                │   │                │   │
│  │ POST /login    │   │ GET /          │   │ GET /          │   │ GET /          │   │
│  │ POST /register │   │ GET /:id       │   │ GET /:id       │   │ GET /:id       │   │
│  │ POST /refresh  │   │ POST /         │   │ POST /         │   │ POST /         │   │
│  │ POST /logout   │   │ PUT /:id       │   │ PUT /:id       │   │ PUT /:id       │   │
│  │ POST /verify   │   │ DELETE /:id    │   │ DELETE /:id    │   │ DELETE /:id    │   │
│  └────────────────┘   └────────────────┘   └────────────────┘   └────────────────┘   │
│                                                                                       │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   │
│  │   fees.js      │   │ attendance.js  │   │   exams.js     │   │ admissions.js  │   │
│  │                │   │                │   │                │   │                │   │
│  │ GET /          │   │ GET /          │   │ GET /          │   │ GET /inquiries │   │
│  │ GET /:id       │   │ POST /         │   │ GET /:id       │   │ POST /inquiries│   │
│  │ POST /         │   │ POST /bulk     │   │ POST /         │   │ POST /convert  │   │
│  │ PUT /:id/pay   │   │ GET /summary   │   │ POST /results  │   │ GET /analytics │   │
│  │ POST /remind   │   │ GET /low       │   │ GET /analytics │   │                │   │
│  └────────────────┘   └────────────────┘   └────────────────┘   └────────────────┘   │
│                                                                                       │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   ┌────────────────┐   │
│  │  dashboard.js  │   │notifications.js│   │ performance.js │   │   parent.js    │   │
│  │                │   │                │   │                │   │                │   │
│  │ GET /stats     │   │ POST /send     │   │ GET /student   │   │ GET /children  │   │
│  │ GET /revenue   │   │ POST /bulk     │   │ GET /batch     │   │ GET /fees      │   │
│  │ GET /attendance│   │ GET /history   │   │ GET /compare   │   │ GET /attendance│   │
│  │ GET /performance│  │ GET /templates │   │ GET /trends    │   │ GET /results   │   │
│  └────────────────┘   └────────────────┘   └────────────────┘   └────────────────┘   │
│                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                  MODELS LAYER                                         │
│                            /backend/models/*.js                                       │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Student.js  │  │  Faculty.js  │  │   Batch.js   │  │  Course.js   │              │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤              │
│  │ • findAll()  │  │ • findAll()  │  │ • findAll()  │  │ • findAll()  │              │
│  │ • findById() │  │ • findById() │  │ • findById() │  │ • findById() │              │
│  │ • create()   │  │ • create()   │  │ • create()   │  │ • create()   │              │
│  │ • update()   │  │ • update()   │  │ • addStudent │  │ • update()   │              │
│  │ • delete()   │  │ • delete()   │  │ • getStudents│  │ • delete()   │              │
│  │ • search()   │  │ • getBatches │  │ • getFaculty │  │ • getSyllabus│              │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │    Fee.js    │  │ Attendance.js│  │   Exam.js    │  │  Inquiry.js  │              │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤              │
│  │ • findAll()  │  │ • mark()     │  │ • schedule() │  │ • findAll()  │              │
│  │ • findById() │  │ • markBulk() │  │ • addResults │  │ • create()   │              │
│  │ • create()   │  │ • getSummary │  │ • publish()  │  │ • update()   │              │
│  │ • recordPay()│  │ • getLow()   │  │ • analytics()│  │ • convert()  │              │
│  │ • getSummary │  │ • getByDate()│  │ • getRanks() │  │ • followUp() │              │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                                       │
│  ┌──────────────┐  ┌──────────────┐                                                  │
│  │Performance.js│  │  Syllabus.js │                                                  │
│  ├──────────────┤  ├──────────────┤                                                  │
│  │ • analyze()  │  │ • getTopics()│                                                  │
│  │ • compare()  │  │ • updateProg │                                                  │
│  │ • trends()   │  │ • getStatus()│                                                  │
│  │ • studentRep │  │ • batchProg()│                                                  │
│  └──────────────┘  └──────────────┘                                                  │
│                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                 SERVICES LAYER                                        │
│                           /backend/services/*.js                                      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          notificationService.js                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  • sendWhatsApp(phone, message)      • sendSMS(phone, message)          │    │ │
│  │  │  • sendEmail(email, subject, body)   • sendBulk(recipients, message)    │    │ │
│  │  │  • getTemplates()                    • processTemplate(template, data)  │    │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          feeReminderService.js                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  • checkDueFees()        • sendReminder(studentId)   • getOverdue()     │    │ │
│  │  │  • calculateLateFee()    • scheduleReminders()       • generateReport() │    │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                         attendanceAlertService.js                                │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  • notifyAbsent(studentId)    • checkLowAttendance()  • dailyReport()   │    │ │
│  │  │  • parentAlert(parentPhone)   • getAttendanceStats()  • warnings()      │    │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                         performanceAnalytics.js                                  │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  • analyzeStudent(id)    • analyzeBatch(id)      • comparePerformance() │    │ │
│  │  │  • getTrends()           • generateInsights()    • predictPerformance() │    │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           reportGenerator.js                                     │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │ │
│  │  │  • studentReport(id)     • batchReport(id)       • feeReport(filters)   │    │ │
│  │  │  • attendanceReport()    • exportPDF(data)       • exportExcel(data)    │    │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request-Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          REQUEST-RESPONSE FLOW DIAGRAM                               │
└─────────────────────────────────────────────────────────────────────────────────────┘

    CLIENT                  SERVER                         DATABASE
      │                       │                               │
      │   HTTP Request        │                               │
      │   GET /api/students   │                               │
      │ ─────────────────────>│                               │
      │                       │                               │
      │                       │ ┌───────────────────────────┐ │
      │                       │ │      MIDDLEWARE CHAIN     │ │
      │                       │ ├───────────────────────────┤ │
      │                       │ │ 1. helmet() - Security    │ │
      │                       │ │ 2. cors() - CORS Headers  │ │
      │                       │ │ 3. rateLimit() - Throttle │ │
      │                       │ │ 4. express.json() - Parse │ │
      │                       │ │ 5. morgan() - Logging     │ │
      │                       │ │ 6. authMiddleware() - JWT │ │
      │                       │ └───────────────────────────┘ │
      │                       │                               │
      │                       │ ┌───────────────────────────┐ │
      │                       │ │    ROUTE HANDLER          │ │
      │                       │ │   routes/students.js      │ │
      │                       │ └─────────────┬─────────────┘ │
      │                       │               │               │
      │                       │               ▼               │
      │                       │ ┌───────────────────────────┐ │
      │                       │ │      MODEL LAYER          │ │
      │                       │ │    models/Student.js      │ │
      │                       │ └─────────────┬─────────────┘ │
      │                       │               │               │
      │                       │               │  SQL Query    │
      │                       │               │ ─────────────>│
      │                       │               │               │
      │                       │               │  Result Set   │
      │                       │               │ <─────────────│
      │                       │               │               │
      │                       │ ┌─────────────┴─────────────┐ │
      │                       │ │    RESPONSE FORMATTER     │ │
      │                       │ │  { success: true,         │ │
      │                       │ │    data: [...] }          │ │
      │                       │ └───────────────────────────┘ │
      │                       │                               │
      │   HTTP Response       │                               │
      │   200 OK {data}       │                               │
      │ <─────────────────────│                               │
      │                       │                               │
```

### 2.3 Authentication Flow (LLD)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION FLOW - LLD                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

    USER                    FRONTEND                   BACKEND                  DATABASE
      │                        │                          │                        │
      │  Enter Credentials     │                          │                        │
      │  (email, password)     │                          │                        │
      │ ──────────────────────>│                          │                        │
      │                        │                          │                        │
      │                        │  POST /api/auth/login    │                        │
      │                        │  {email, password}       │                        │
      │                        │ ────────────────────────>│                        │
      │                        │                          │                        │
      │                        │                          │  SELECT * FROM users   │
      │                        │                          │  WHERE email = ?       │
      │                        │                          │ ───────────────────────>
      │                        │                          │                        │
      │                        │                          │  User Record           │
      │                        │                          │ <───────────────────────
      │                        │                          │                        │
      │                        │                          │ ┌────────────────────┐ │
      │                        │                          │ │ Verify Password    │ │
      │                        │                          │ │ bcrypt.compare()   │ │
      │                        │                          │ └────────────────────┘ │
      │                        │                          │                        │
      │                        │                          │ ┌────────────────────┐ │
      │                        │                          │ │ Check MFA Enabled  │ │
      │                        │                          │ └────────────────────┘ │
      │                        │                          │                        │
      │                        │  {requireMFA: true}      │                        │
      │                        │ <────────────────────────│                        │
      │                        │                          │                        │
      │  Show MFA Input        │                          │                        │
      │ <──────────────────────│                          │                        │
      │                        │                          │                        │
      │  Enter OTP Code        │                          │                        │
      │ ──────────────────────>│                          │                        │
      │                        │                          │                        │
      │                        │  POST /api/mfa/verify    │                        │
      │                        │  {email, code}           │                        │
      │                        │ ────────────────────────>│                        │
      │                        │                          │                        │
      │                        │                          │ ┌────────────────────┐ │
      │                        │                          │ │ Verify TOTP Code   │ │
      │                        │                          │ │ speakeasy.verify() │ │
      │                        │                          │ └────────────────────┘ │
      │                        │                          │                        │
      │                        │                          │ ┌────────────────────┐ │
      │                        │                          │ │ Generate JWT Token │ │
      │                        │                          │ │ jwt.sign({         │ │
      │                        │                          │ │   userId, role,    │ │
      │                        │                          │ │   exp: 24h         │ │
      │                        │                          │ │ })                 │ │
      │                        │                          │ └────────────────────┘ │
      │                        │                          │                        │
      │                        │  {token, user}           │                        │
      │                        │ <────────────────────────│                        │
      │                        │                          │                        │
      │                        │ ┌────────────────────┐   │                        │
      │                        │ │ Store in           │   │                        │
      │                        │ │ localStorage       │   │                        │
      │                        │ └────────────────────┘   │                        │
      │                        │                          │                        │
      │  Redirect to Dashboard │                          │                        │
      │ <──────────────────────│                          │                        │
      │                        │                          │                        │
```

---

## 3. Component Architecture

### 3.1 Frontend Component Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND COMPONENT ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

frontend/
├── index.html              # Landing Page with Login/MFA
│   ├── Components
│   │   ├── Hero Section
│   │   ├── Features Grid
│   │   ├── Login Modal
│   │   │   ├── Role Tabs (Admin/Staff/Faculty)
│   │   │   ├── Login Form
│   │   │   └── MFA Verification
│   │   └── Credentials Display
│   └── JavaScript Modules
│       ├── Authentication Handler
│       ├── MFA Handler
│       └── Form Validation
│
├── dashboard.html          # Main Dashboard
│   ├── Sidebar Navigation
│   │   ├── Dashboard
│   │   ├── Students
│   │   ├── Batches
│   │   ├── Faculty
│   │   ├── Fee Management
│   │   ├── Attendance
│   │   ├── Exams
│   │   ├── Inquiries
│   │   ├── Reports
│   │   └── Settings
│   ├── Main Content Area
│   │   ├── Stats Cards
│   │   ├── Charts
│   │   ├── Data Tables
│   │   └── Forms
│   └── JavaScript Modules
│       ├── Section Loaders
│       ├── API Handlers
│       ├── Chart Renderers
│       └── Table Handlers
│
├── student-portal.html     # Student Self-Service
│   ├── Profile View
│   ├── Attendance View
│   ├── Results View
│   ├── Fee Status View
│   └── Notifications
│
└── mfa-setup.html          # MFA Configuration
    ├── QR Code Display
    ├── Secret Key Input
    └── Verification Test
```

### 3.2 Backend Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND COMPONENT ARCHITECTURE                             │
└─────────────────────────────────────────────────────────────────────────────────────┘

backend/
├── server.js                 # Application Entry Point
│   └── startServer()
│       ├── connectDatabase()
│       ├── initializeScheduledJobs()
│       └── app.listen()
│
├── app.js                    # Express Application Factory
│   └── createApp()
│       ├── Security Middleware
│       │   ├── helmet()
│       │   ├── cors()
│       │   └── rateLimit()
│       ├── Parsing Middleware
│       │   ├── express.json()
│       │   └── express.urlencoded()
│       ├── Logging Middleware
│       │   └── morgan()
│       ├── Static File Serving
│       │   └── express.static('frontend')
│       ├── Route Mounting
│       │   ├── /api/auth → authRoutes
│       │   ├── /api/students → studentRoutes
│       │   ├── /api/faculty → facultyRoutes
│       │   ├── /api/batches → batchRoutes
│       │   ├── /api/fees → feeRoutes
│       │   ├── /api/attendance → attendanceRoutes
│       │   ├── /api/exams → examRoutes
│       │   ├── /api/admissions → admissionRoutes
│       │   ├── /api/dashboard → dashboardRoutes
│       │   └── /api/notifications → notificationRoutes
│       └── Error Handlers
│           ├── 404 Handler
│           └── Global Error Handler
│
├── config/
│   ├── database.js           # PostgreSQL Connection Pool
│   │   └── connectDatabase()
│   └── logger.js             # Winston Logger Configuration
│       └── logger.info/error/warn()
│
├── routes/                   # API Route Definitions
│   ├── auth.js               # Authentication Routes
│   ├── mfa.js                # MFA Routes
│   ├── students.js           # Student CRUD Routes
│   ├── faculty.js            # Faculty CRUD Routes
│   ├── batches.js            # Batch Management Routes
│   ├── fees.js               # Fee Management Routes
│   ├── attendance.js         # Attendance Routes
│   ├── exams.js              # Exam Management Routes
│   ├── admissions.js         # Inquiry/Admission Routes
│   ├── dashboard.js          # Dashboard Stats Routes
│   ├── notifications.js      # Notification Routes
│   ├── performance.js        # Performance Analytics
│   ├── academic.js           # Academic Routes
│   └── parent.js             # Parent Portal Routes
│
├── models/                   # Data Access Layer
│   ├── Student.js            # Student Model
│   ├── Faculty.js            # Faculty Model
│   ├── Batch.js              # Batch Model
│   ├── Course.js             # Course Model
│   ├── Fee.js                # Fee Model
│   ├── Attendance.js         # Attendance Model
│   ├── Exam.js               # Exam Model
│   ├── Inquiry.js            # Inquiry Model
│   ├── Performance.js        # Performance Model
│   └── Syllabus.js           # Syllabus Model
│
├── services/                 # Business Logic Services
│   ├── notificationService.js     # Notification Handling
│   ├── feeReminderService.js      # Fee Reminders
│   ├── attendanceAlertService.js  # Attendance Alerts
│   ├── performanceAnalytics.js    # Performance Analysis
│   └── reportGenerator.js         # Report Generation
│
├── automation/
│   └── scheduledJobs.js      # Cron Jobs
│       ├── Daily Fee Check (8:00 AM)
│       ├── Attendance Alerts (6:00 PM)
│       ├── Weekly Reports (Sunday 9:00 AM)
│       └── Monthly Analytics (1st of Month)
│
└── __tests__/                # Unit Tests
    └── students.overview.test.js
```

---

## 4. Data Flow Architecture

### 4.1 Student Enrollment Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                        STUDENT ENROLLMENT DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────┐
     │   INQUIRY   │
     │   Created   │
     └──────┬──────┘
            │
            ▼
     ┌─────────────┐     ┌───────────────────────────────────────┐
     │  Follow-up  │────>│  • Call/WhatsApp sent                 │
     │   Process   │     │  • Demo class scheduled               │
     └──────┬──────┘     │  • Counselor assigned                 │
            │            └───────────────────────────────────────┘
            ▼
     ┌─────────────┐
     │   Convert   │
     │ to Student  │
     └──────┬──────┘
            │
            ├─────────────────────────────────┐
            ▼                                 ▼
     ┌─────────────┐                   ┌─────────────┐
     │   Create    │                   │   Create    │
     │  Student    │                   │  User A/C   │
     │   Record    │                   │  (Optional) │
     └──────┬──────┘                   └──────┬──────┘
            │                                 │
            ├─────────────────────────────────┘
            ▼
     ┌─────────────┐
     │   Assign    │
     │  to Batch   │
     └──────┬──────┘
            │
            ├──────────────────────────────────┐
            ▼                                  ▼
     ┌─────────────┐                    ┌─────────────┐
     │  Generate   │                    │   Create    │
     │ Enrollment  │                    │  Fee Entry  │
     │   Number    │                    │             │
     └──────┬──────┘                    └──────┬──────┘
            │                                  │
            └──────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Send     │
                    │  Welcome    │
                    │ Notification│
                    └─────────────┘
```

### 4.2 Fee Collection Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           FEE COLLECTION DATA FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────────────┘

     ┌─────────────────┐
     │  Fee Structure  │
     │     Created     │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │  Student Fee    │
     │    Generated    │
     └────────┬────────┘
              │
              ├─────────────────────────────────────────────────────┐
              │                                                     │
              ▼                                                     ▼
     ┌─────────────────┐                               ┌─────────────────────┐
     │   Due Date      │                               │   Installments      │
     │   Assigned      │                               │     Created         │
     └────────┬────────┘                               └──────────┬──────────┘
              │                                                   │
              │     7 Days Before Due                             │
              ├─────────────────────────────────────┐             │
              ▼                                     ▼             │
     ┌─────────────────┐                   ┌─────────────────┐   │
     │ Reminder Sent   │                   │ WhatsApp/SMS    │   │
     │  (Auto Trigger) │                   │    Sent         │   │
     └────────┬────────┘                   └─────────────────┘   │
              │                                                   │
              ▼                                                   │
     ┌─────────────────┐                                         │
     │ Payment Made    │<────────────────────────────────────────┘
     │                 │
     └────────┬────────┘
              │
              ├───────────────────────────────┐
              ▼                               ▼
     ┌─────────────────┐             ┌─────────────────┐
     │   Online        │             │   Offline       │
     │  (Razorpay)     │             │  (Cash/UPI)     │
     └────────┬────────┘             └────────┬────────┘
              │                               │
              └───────────────────────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   Receipt       │
                     │   Generated     │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   Balance       │
                     │   Updated       │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │  Confirmation   │
                     │     Sent        │
                     └─────────────────┘
```

---

## 5. Security Architecture

### 5.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            SECURITY ARCHITECTURE                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              LAYER 1: NETWORK SECURITY                               │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                      │
│  │  HTTPS/TLS 1.3  │  │    Firewall     │  │   DDoS Prot.    │                      │
│  │  Encryption     │  │   (Cloud/VM)    │  │   (CloudFlare)  │                      │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                             LAYER 2: APPLICATION SECURITY                            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Helmet.js     │  │   CORS Policy   │  │  Rate Limiting  │  │  Input Valid.   │ │
│  │  (HTTP Headers) │  │  (Whitelist)    │  │  (100 req/min)  │  │  (Sanitization) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            LAYER 3: AUTHENTICATION                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  JWT Tokens     │  │  Password Hash  │  │  MFA/2FA        │  │  Session Mgmt   │ │
│  │  (24h expiry)   │  │  (bcrypt)       │  │  (TOTP)         │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              LAYER 4: AUTHORIZATION                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │                         ROLE-BASED ACCESS CONTROL (RBAC)                     │   │
│  ├──────────────┬───────────────────┬────────────────────┬─────────────────────┤   │
│  │    ADMIN     │       STAFF       │      FACULTY       │      STUDENT        │   │
│  ├──────────────┼───────────────────┼────────────────────┼─────────────────────┤   │
│  │ Full Access  │ Student Mgmt      │ Attendance Entry   │ View Own Data       │   │
│  │ All Modules  │ Fee Collection    │ Result Entry       │ View Results        │   │
│  │ User Mgmt    │ Attendance        │ View Own Batches   │ View Attendance     │   │
│  │ Reports      │ Inquiry Handling  │ Syllabus Progress  │ Fee Status          │   │
│  │ Settings     │ Basic Reports     │                    │                     │   │
│  └──────────────┴───────────────────┴────────────────────┴─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              LAYER 5: DATA SECURITY                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  SQL Injection  │  │  Encrypted      │  │   Audit Logs    │  │   Backup &      │ │
│  │  Prevention     │  │  Storage        │  │  (All Actions)  │  │   Recovery      │ │
│  │  (Param. Query) │  │  (Sensitive)    │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Integration Architecture

### 6.1 External System Integrations

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          INTEGRATION ARCHITECTURE                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

                              ┌────────────────────┐
                              │     EDUPRIME       │
                              │    API SERVER      │
                              └─────────┬──────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
          ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  PAYMENT GATEWAY │         │   COMMUNICATION  │         │    AUTOMATION    │
│     RAZORPAY     │         │     SERVICES     │         │       N8N        │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│                  │         │                  │         │                  │
│ • Create Order   │         │ ┌──────────────┐ │         │ • Fee Reminders  │
│ • Verify Payment │         │ │  WhatsApp    │ │         │ • Attendance     │
│ • Refund         │         │ │  Business    │ │         │   Alerts         │
│ • Subscription   │         │ │  API         │ │         │ • Daily Reports  │
│                  │         │ └──────────────┘ │         │ • Inquiry        │
│ Webhook:         │         │ ┌──────────────┐ │         │   Follow-up      │
│ /webhooks/payment│         │ │    Email     │ │         │                  │
│                  │         │ │   (SMTP)     │ │         │ Webhook:         │
└──────────────────┘         │ └──────────────┘ │         │ /webhooks/n8n    │
                             │ ┌──────────────┐ │         │                  │
                             │ │    SMS       │ │         └──────────────────┘
                             │ │  Gateway     │ │
                             │ └──────────────┘ │
                             └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           N8N WORKFLOW INTEGRATIONS                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                        fee-reminders.json                                      │  │
│  │  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │  │
│  │  │Schedule │───>│ Query Due   │───>│ Format Msg  │───>│ Send        │         │  │
│  │  │ 8:00AM  │    │ Fees        │    │             │    │ WhatsApp    │         │  │
│  │  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘         │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                       attendance-alerts.json                                   │  │
│  │  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │  │
│  │  │Schedule │───>│ Get Absent  │───>│ Get Parent  │───>│ Send Alert  │         │  │
│  │  │ 6:00PM  │    │ Students    │    │ Numbers     │    │             │         │  │
│  │  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘         │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                         daily-report.json                                      │  │
│  │  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │  │
│  │  │Schedule │───>│ Aggregate   │───>│ Generate    │───>│ Email to    │         │  │
│  │  │ 9:00PM  │    │ Daily Data  │    │ Report      │    │ Admin       │         │  │
│  │  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘         │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
│  ┌───────────────────────────────────────────────────────────────────────────────┐  │
│  │                       inquiry-followup.json                                    │  │
│  │  ┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │  │
│  │  │Schedule │───>│ Get Pending │───>│ Check Last  │───>│ Send        │         │  │
│  │  │ 10:00AM │    │ Inquiries   │    │ Contact     │    │ Follow-up   │         │  │
│  │  └─────────┘    └─────────────┘    └─────────────┘    └─────────────┘         │  │
│  └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOYMENT ARCHITECTURE                                    │
└─────────────────────────────────────────────────────────────────────────────────────┘

                           ┌───────────────────────┐
                           │     DOCKER HOST       │
                           │   (docker-compose)    │
                           └───────────┬───────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│   eduprime-api       │   │   eduprime-db        │   │   eduprime-n8n       │
│   (Node.js App)      │   │   (PostgreSQL)       │   │   (Automation)       │
├──────────────────────┤   ├──────────────────────┤   ├──────────────────────┤
│ Port: 3000           │   │ Port: 5432           │   │ Port: 5678           │
│ Image: node:18       │   │ Image: postgres:15   │   │ Image: n8nio/n8n     │
│                      │   │                      │   │                      │
│ Volumes:             │   │ Volumes:             │   │ Volumes:             │
│ - ./backend:/app     │   │ - pgdata:/var/lib/   │   │ - n8n_data:/home/    │
│ - ./frontend:/app/   │   │   postgresql/data    │   │   node/.n8n          │
│   frontend           │   │                      │   │                      │
│ - ./uploads:/app/    │   │ Environment:         │   │ Environment:         │
│   uploads            │   │ - POSTGRES_DB        │   │ - N8N_BASIC_AUTH     │
│                      │   │ - POSTGRES_USER      │   │ - WEBHOOK_URL        │
│ Environment:         │   │ - POSTGRES_PASSWORD  │   │                      │
│ - DATABASE_URL       │   │                      │   │                      │
│ - JWT_SECRET         │   │                      │   │                      │
│ - RAZORPAY_KEY       │   │                      │   │                      │
│ - WHATSAPP_TOKEN     │   │                      │   │                      │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
           │                           │                           │
           └───────────────────────────┼───────────────────────────┘
                                       │
                                       ▼
                           ┌───────────────────────┐
                           │   Docker Network      │
                           │   eduprime-network    │
                           └───────────────────────┘
```

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Jan 2026 | EduPrime Team | Initial architecture documentation |

---

*This document is part of the EduPrime Institute Management System documentation.*
