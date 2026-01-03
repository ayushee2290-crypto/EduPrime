# EduPrime API Documentation

## Base URL
```
http://localhost:3000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@eduprime.edu",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@eduprime.edu",
    "role": "admin"
  }
}
```

---

## Students API

### List All Students
```http
GET /students?status=active&class_name=12&batch_id=1&limit=50&offset=0
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (active, inactive, graduated) |
| class_name | string | Filter by class |
| batch_id | number | Filter by batch |
| search | string | Search by name, email, or phone |
| limit | number | Pagination limit (default: 50) |
| offset | number | Pagination offset (default: 0) |

### Get Student by ID
```http
GET /students/:id
```

### Create Student
```http
POST /students
Content-Type: application/json

{
  "first_name": "Rahul",
  "last_name": "Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "parent_phone": "9876543211",
  "class_name": "12",
  "date_of_birth": "2006-05-15",
  "address": "123 Main St, City",
  "batch_ids": [1, 2]
}
```

### Update Student
```http
PUT /students/:id
Content-Type: application/json

{
  "first_name": "Rahul",
  "status": "active"
}
```

### Delete Student
```http
DELETE /students/:id
```

### Get Student Performance
```http
GET /students/:id/performance
```

### Get Student Attendance
```http
GET /students/:id/attendance?from_date=2025-01-01&to_date=2025-01-31
```

### Get Student Fees
```http
GET /students/:id/fees?status=pending
```

---

## Batches API

### List All Batches
```http
GET /batches?status=active&faculty_id=1
```

### Get Batch by ID
```http
GET /batches/:id
```

### Create Batch
```http
POST /batches
Content-Type: application/json

{
  "name": "JEE-2025 Morning",
  "subject": "Physics",
  "faculty_id": 1,
  "schedule": "Mon, Wed, Fri",
  "start_time": "09:00",
  "end_time": "11:00",
  "max_students": 30,
  "fee_amount": 15000
}
```

### Update Batch
```http
PUT /batches/:id
```

### Delete Batch
```http
DELETE /batches/:id
```

### Get Batch Students
```http
GET /batches/:id/students
```

### Add Student to Batch
```http
POST /batches/:id/students
Content-Type: application/json

{
  "student_id": 1
}
```

### Remove Student from Batch
```http
DELETE /batches/:id/students/:student_id
```

---

## Faculty API

### List All Faculty
```http
GET /faculty?status=active&subject=Physics
```

### Get Faculty by ID
```http
GET /faculty/:id
```

### Create Faculty
```http
POST /faculty
Content-Type: application/json

{
  "first_name": "Dr. Amit",
  "last_name": "Kumar",
  "email": "amit@eduprime.edu",
  "phone": "9876543212",
  "specialization": "Physics",
  "qualification": "Ph.D. IIT Delhi",
  "experience_years": 10,
  "salary": 75000
}
```

### Update Faculty
```http
PUT /faculty/:id
```

### Delete Faculty
```http
DELETE /faculty/:id
```

### Get Faculty Batches
```http
GET /faculty/:id/batches
```

### Get Faculty Schedule
```http
GET /faculty/:id/schedule
```

---

## Fees API

### List All Fees
```http
GET /fees?status=pending&student_id=1&from_date=2025-01-01&to_date=2025-01-31
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (pending, paid, overdue, waived) |
| student_id | number | Filter by student |
| fee_type | string | Filter by type (tuition, admission, exam, library) |
| from_date | date | Filter by due date range start |
| to_date | date | Filter by due date range end |

### Get Fee by ID
```http
GET /fees/:id
```

### Create Fee
```http
POST /fees
Content-Type: application/json

{
  "student_id": 1,
  "fee_type": "tuition",
  "amount": 15000,
  "due_date": "2025-02-01",
  "description": "February Tuition Fee"
}
```

### Record Payment
```http
PUT /fees/:id/pay
Content-Type: application/json

{
  "payment_method": "upi",
  "transaction_id": "UPI123456789",
  "payment_date": "2025-01-15"
}
```

### Get Fee Summary
```http
GET /fees/summary?from_date=2025-01-01&to_date=2025-01-31
```

**Response:**
```json
{
  "total_fees": 500000,
  "collected": 350000,
  "pending": 100000,
  "overdue": 50000,
  "collection_rate": "70%"
}
```

### Send Fee Reminder
```http
POST /fees/:id/remind
Content-Type: application/json

{
  "channel": "whatsapp"  // whatsapp, sms, email
}
```

---

## Attendance API

### Get Attendance Records
```http
GET /attendance?batch_id=1&date=2025-01-15&student_id=1
```

### Mark Single Attendance
```http
POST /attendance
Content-Type: application/json

{
  "student_id": 1,
  "batch_id": 1,
  "date": "2025-01-15",
  "status": "present",  // present, absent, late, excused
  "remarks": "Arrived 5 mins late"
}
```

### Bulk Mark Attendance
```http
POST /attendance/bulk
Content-Type: application/json

{
  "batch_id": 1,
  "date": "2025-01-15",
  "attendance": [
    { "student_id": 1, "status": "present" },
    { "student_id": 2, "status": "absent" },
    { "student_id": 3, "status": "late" }
  ]
}
```

### Get Attendance Summary
```http
GET /attendance/summary?batch_id=1&from_date=2025-01-01&to_date=2025-01-31
```

### Get Low Attendance Students
```http
GET /attendance/low-attendance?threshold=75
```

---

## Exams API

### List All Exams
```http
GET /exams?batch_id=1&status=scheduled&exam_type=unit_test
```

### Get Exam by ID
```http
GET /exams/:id
```

### Create Exam
```http
POST /exams
Content-Type: application/json

{
  "title": "Physics Unit Test - Chapter 1",
  "batch_id": 1,
  "subject_id": 1,
  "exam_type": "unit_test",  // unit_test, mid_term, final, mock
  "exam_date": "2025-01-20",
  "start_time": "10:00",
  "duration_minutes": 90,
  "total_marks": 50,
  "passing_marks": 20,
  "syllabus": "Newton's Laws of Motion",
  "instructions": "Answer all questions"
}
```

### Update Exam
```http
PUT /exams/:id
```

### Delete Exam
```http
DELETE /exams/:id
```

### Get Exam Results
```http
GET /exams/:id/results
```

**Response:**
```json
{
  "results": [
    {
      "student_id": 1,
      "student_name": "Rahul Sharma",
      "marks_obtained": 45,
      "total_marks": 50,
      "percentage": 90,
      "rank": 1
    }
  ],
  "statistics": {
    "total_students": 25,
    "highest": 95,
    "lowest": 35,
    "average": 72.5,
    "passed": 22,
    "failed": 3
  }
}
```

### Add Exam Result
```http
POST /exams/:id/results
Content-Type: application/json

{
  "student_id": 1,
  "marks_obtained": 45,
  "remarks": "Excellent performance"
}
```

### Bulk Upload Results
```http
POST /exams/:id/results/bulk
Content-Type: application/json

{
  "results": [
    { "student_id": 1, "marks_obtained": 45 },
    { "student_id": 2, "marks_obtained": 38 },
    { "student_id": 3, "marks_obtained": 42 }
  ]
}
```

### Get Exam Analytics
```http
GET /exams/:id/analytics
```

---

## Inquiries API

### List All Inquiries
```http
GET /admissions/inquiries?status=new&source=website&course_interest=JEE
```

### Get Inquiry by ID
```http
GET /admissions/inquiries/:id
```

### Create Inquiry
```http
POST /admissions/inquiries
Content-Type: application/json

{
  "student_name": "Ankit Verma",
  "phone": "9876543213",
  "email": "ankit@example.com",
  "parent_name": "Ramesh Verma",
  "parent_phone": "9876543214",
  "class_interested": "11",
  "course_interest": "IIT-JEE",
  "source": "referral",
  "notes": "Referred by existing student"
}
```

### Update Inquiry
```http
PUT /admissions/inquiries/:id
Content-Type: application/json

{
  "status": "contacted",
  "follow_up_date": "2025-01-20",
  "counselor_notes": "Interested in demo class"
}
```

### Convert to Student
```http
POST /admissions/inquiries/:id/convert
Content-Type: application/json

{
  "batch_ids": [1, 2],
  "admission_fee": 5000,
  "tuition_fee": 15000
}
```

### Get Inquiry Analytics
```http
GET /admissions/analytics
```

---

## Dashboard API

### Get Dashboard Stats
```http
GET /dashboard/stats
```

**Response:**
```json
{
  "totalStudents": 245,
  "activeStudents": 230,
  "totalFaculty": 15,
  "totalBatches": 12,
  "monthlyRevenue": 450000,
  "pendingFees": 125000,
  "avgAttendance": 87.5,
  "newInquiries": 8
}
```

### Get Revenue Analytics
```http
GET /dashboard/revenue?period=monthly&months=6
```

### Get Attendance Analytics
```http
GET /dashboard/attendance?batch_id=1&days=30
```

### Get Performance Analytics
```http
GET /dashboard/performance?batch_id=1
```

---

## Notifications API

### Send Notification
```http
POST /notifications/send
Content-Type: application/json

{
  "student_ids": [1, 2, 3],
  "channel": "whatsapp",  // whatsapp, sms, email, all
  "message": "Reminder: Tomorrow is a holiday",
  "type": "announcement"
}
```

### Send Bulk Notification
```http
POST /notifications/bulk
Content-Type: application/json

{
  "batch_id": 1,  // or "all" for all students
  "channel": "whatsapp",
  "message": "Class cancelled due to technical issues"
}
```

### Get Notification History
```http
GET /notifications?student_id=1&type=fee_reminder&from_date=2025-01-01
```

---

## Reports API

### Generate Student Report
```http
POST /reports/student/:id
Content-Type: application/json

{
  "format": "pdf",  // pdf, excel
  "include": ["attendance", "fees", "results"]
}
```

### Generate Batch Report
```http
POST /reports/batch/:id
Content-Type: application/json

{
  "format": "excel"
}
```

### Generate Fee Collection Report
```http
POST /reports/fees
Content-Type: application/json

{
  "from_date": "2025-01-01",
  "to_date": "2025-01-31",
  "status": "all",
  "format": "excel"
}
```

### Generate Attendance Report
```http
POST /reports/attendance
Content-Type: application/json

{
  "batch_id": 1,
  "month": 1,
  "year": 2025,
  "format": "excel"
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| UNAUTHORIZED | 401 | Invalid or missing token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| VALIDATION_ERROR | 400 | Invalid request data |
| INTERNAL_ERROR | 500 | Server error |

---

## Rate Limiting

API requests are limited to:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated requests

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642329600
```

---

## Webhooks

### Inquiry Webhook
Register new inquiries from external sources:
```http
POST /webhooks/inquiry
Content-Type: application/json

{
  "student_name": "Test Student",
  "phone": "9876543210",
  "course_interest": "JEE",
  "source": "website_form"
}
```

### Payment Webhook
For payment gateway callbacks:
```http
POST /webhooks/payment
Content-Type: application/json

{
  "fee_id": 123,
  "transaction_id": "TXN123456",
  "status": "success",
  "amount": 15000
}
```
