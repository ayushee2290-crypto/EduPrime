# EduPrime Institute Management System
# Complete User Manual & FAQs

**Version:** 1.0  
**Last Updated:** January 2025  
**Audience:** All System Users (Admin, Staff, Faculty, Parents)

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Login & Authentication](#2-login--authentication)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Student Management](#4-student-management)
5. [Faculty Management](#5-faculty-management)
6. [Batch & Course Management](#6-batch--course-management)
7. [Fee Management](#7-fee-management)
8. [Attendance Management](#8-attendance-management)
9. [Exam Management](#9-exam-management)
10. [Performance Analytics](#10-performance-analytics)
11. [Admissions Module](#11-admissions-module)
12. [Reports & Analytics](#12-reports--analytics)
13. [Notification System](#13-notification-system)
14. [Parent Portal](#14-parent-portal)
15. [Settings & Configuration](#15-settings--configuration)
16. [Frequently Asked Questions (FAQs)](#16-frequently-asked-questions-faqs)
17. [Troubleshooting Guide](#17-troubleshooting-guide)
18. [Keyboard Shortcuts](#18-keyboard-shortcuts)
19. [Glossary of Terms](#19-glossary-of-terms)
20. [Support & Contact](#20-support--contact)

---

## 1. Getting Started

### 1.1 System Requirements

| Component | Minimum Requirement |
|-----------|---------------------|
| Browser | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| Screen Resolution | 1366 x 768 (Recommended: 1920 x 1080) |
| Internet | Stable broadband connection |
| JavaScript | Must be enabled |
| Cookies | Must be enabled |

### 1.2 Accessing the System

1. **Open your web browser**
2. **Navigate to the EduPrime URL:**
   - Production: `https://your-domain.com`
   - Local Development: `http://localhost:5000`
3. **Bookmark the page** for easy access

### 1.3 First-Time Login

If you're logging in for the first time:

1. Contact your administrator to receive your login credentials
2. Navigate to the login page
3. Enter your email and temporary password
4. You will be prompted to change your password
5. Set up Multi-Factor Authentication (MFA) if required

### 1.4 Browser Setup Recommendations

- **Clear cache regularly** for optimal performance
- **Enable notifications** to receive system alerts
- **Disable pop-up blockers** for the EduPrime domain
- **Use incognito mode** only for testing

---

## 2. Login & Authentication

### 2.1 Standard Login Process

**Step-by-Step:**

1. Go to the login page (`/index.html`)
2. Enter your **Email Address**
3. Enter your **Password**
4. Click **"Login"** button

![Login Process](images/login-process.png)

### 2.2 Multi-Factor Authentication (MFA)

MFA provides an extra layer of security for your account.

#### Setting Up MFA:

1. After login, go to **Settings** → **Security**
2. Click **"Enable MFA"**
3. Scan the QR code with an authenticator app:
   - Google Authenticator
   - Microsoft Authenticator
   - Authy
4. Enter the 6-digit code from the app
5. Save the backup codes in a secure location

#### Using MFA at Login:

1. Enter your email and password
2. Click "Login"
3. Enter the 6-digit code from your authenticator app
4. Code expires every 30 seconds

### 2.3 Password Requirements

Your password must contain:

- ✅ Minimum 8 characters
- ✅ At least one uppercase letter (A-Z)
- ✅ At least one lowercase letter (a-z)
- ✅ At least one number (0-9)
- ✅ At least one special character (!@#$%^&*)

### 2.4 Forgot Password

1. Click **"Forgot Password"** on the login page
2. Enter your registered email address
3. Check your email for reset instructions
4. Click the reset link (valid for 1 hour)
5. Create a new password

### 2.5 Session Management

- **Session timeout:** 8 hours of inactivity
- **Remember Me:** Not recommended on shared computers
- **Multiple devices:** Allowed, each session is independent
- **Force Logout:** Contact admin to terminate all sessions

---

## 3. Dashboard Overview

### 3.1 Dashboard Layout

The dashboard is divided into several sections:

```
┌─────────────────────────────────────────────────────────────┐
│  Navigation Header                           User Menu      │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│  Sidebar   │           Main Content Area                    │
│  Menu      │                                                │
│            │  ┌────────────┐ ┌────────────┐ ┌────────────┐ │
│  - Home    │  │ Stat Card  │ │ Stat Card  │ │ Stat Card  │ │
│  - Students│  └────────────┘ └────────────┘ └────────────┘ │
│  - Faculty │                                                │
│  - Batches │  ┌─────────────────────────────────────────┐  │
│  - Fees    │  │                                         │  │
│  - Attend. │  │           Charts & Graphs               │  │
│  - Exams   │  │                                         │  │
│  - Reports │  └─────────────────────────────────────────┘  │
│  - Settings│                                                │
│            │  ┌─────────────────────────────────────────┐  │
│            │  │         Recent Activity Table           │  │
│            │  └─────────────────────────────────────────┘  │
└────────────┴────────────────────────────────────────────────┘
```

### 3.2 Key Metrics Displayed

| Metric | Description |
|--------|-------------|
| Total Students | Active enrolled students |
| Total Faculty | Active faculty members |
| Active Batches | Currently running batches |
| Pending Fees | Total outstanding amount |
| Today's Attendance | Percentage present |
| Upcoming Exams | Exams in next 7 days |

### 3.3 Quick Actions

From the dashboard, you can quickly:

- ➕ **Add New Student** - Click the "+" button
- 📊 **View Reports** - Access from Reports section
- 📢 **Send Notifications** - Broadcast messages
- 🔔 **View Alerts** - Check pending items

### 3.4 Notifications Panel

The bell icon (🔔) shows:

- Unread notification count
- Recent alerts (fee reminders, attendance alerts)
- System announcements
- Click to view all notifications

---

## 4. Student Management

### 4.1 Viewing Students

**Navigation:** Dashboard → Students

**List View Features:**
- Search by name, email, phone, or enrollment number
- Filter by batch, course, or status
- Sort by any column (click column header)
- Pagination: 10, 25, 50, or 100 per page

### 4.2 Adding a New Student

**Step-by-Step:**

1. Click **"+ Add Student"** button
2. Fill in the required fields:

   **Personal Information:**
   - First Name *
   - Last Name *
   - Date of Birth
   - Gender
   - Blood Group
   - Photo (upload)

   **Contact Information:**
   - Email Address *
   - Phone Number *
   - WhatsApp Number
   - Address
   - City, State, PIN Code

   **Academic Information:**
   - Previous School/College
   - Qualification
   - Course * (select from dropdown)
   - Batch * (select from dropdown)

   **Parent/Guardian Information:**
   - Parent Name *
   - Parent Phone *
   - Parent Email
   - Relationship

3. Click **"Save"** to create the student record

### 4.3 Editing Student Information

1. Find the student in the list
2. Click the **Edit** (✏️) icon
3. Modify the required fields
4. Click **"Update"** to save changes

### 4.4 Student Profile View

Click on a student name to view:

- **Overview Tab:** Basic information and current status
- **Academic Tab:** Course, batch, enrollment details
- **Fees Tab:** Payment history and pending dues
- **Attendance Tab:** Attendance records and percentage
- **Performance Tab:** Exam scores and analytics
- **Documents Tab:** Uploaded files and certificates

### 4.5 Student Status Types

| Status | Description | Color |
|--------|-------------|-------|
| Active | Currently enrolled | Green |
| Inactive | Temporarily not attending | Yellow |
| Passed | Completed course | Blue |
| Dropped | Left the institute | Red |

### 4.6 Bulk Operations

**Available bulk actions:**
- Export to Excel/PDF
- Send bulk SMS/Email
- Update batch assignment
- Change status

**To use:**
1. Select students using checkboxes
2. Click **"Bulk Actions"** dropdown
3. Choose the desired action
4. Confirm the operation

---

## 5. Faculty Management

### 5.1 Faculty List

**Navigation:** Dashboard → Faculty

View all faculty members with:
- Profile photo
- Name and designation
- Contact information
- Assigned subjects
- Current batches

### 5.2 Adding New Faculty

1. Click **"+ Add Faculty"**
2. Enter faculty details:

   **Personal Details:**
   - Name *
   - Email *
   - Phone *
   - Gender
   - Date of Birth
   - Address

   **Professional Details:**
   - Designation *
   - Qualification *
   - Specialization
   - Experience (years)
   - Joining Date

   **Account Details:**
   - Create system account (checkbox)
   - Set temporary password

3. Click **"Save"**

### 5.3 Assigning Subjects & Batches

1. Go to Faculty Profile
2. Click **"Manage Assignments"**
3. Select subjects from the dropdown
4. Assign to specific batches
5. Set schedule (days and times)
6. Save assignments

### 5.4 Faculty Dashboard (Faculty Login)

When logged in as faculty, you see:
- Your assigned batches
- Today's schedule
- Pending attendance marking
- Student performance summary
- Announcements

---

## 6. Batch & Course Management

### 6.1 Understanding Courses vs Batches

| Concept | Definition | Example |
|---------|------------|---------|
| **Course** | The program of study | "JEE Main Preparation", "NEET Coaching" |
| **Batch** | A group of students studying together | "JEE 2025 Morning Batch" |

One course can have multiple batches.

### 6.2 Managing Courses

**Navigation:** Dashboard → Courses

**Creating a Course:**
1. Click **"+ Add Course"**
2. Enter:
   - Course Name *
   - Course Code *
   - Duration (months)
   - Course Type (Regular/Crash/Weekend)
   - Description
   - Fee Structure
3. Save the course

### 6.3 Managing Batches

**Navigation:** Dashboard → Batches

**Creating a Batch:**
1. Click **"+ Add Batch"**
2. Select the Course
3. Enter:
   - Batch Name *
   - Start Date *
   - End Date
   - Timing (e.g., 9:00 AM - 12:00 PM)
   - Maximum Capacity
   - Room/Location
   - Faculty Assignment
4. Save the batch

### 6.4 Batch Operations

- **View Students:** See all students in a batch
- **Transfer Students:** Move students between batches
- **Merge Batches:** Combine two batches
- **Close Batch:** Mark batch as completed

---

## 7. Fee Management

### 7.1 Fee Structure

Each course has a defined fee structure:

| Component | Description |
|-----------|-------------|
| Admission Fee | One-time fee at enrollment |
| Tuition Fee | Monthly/Term fee |
| Material Fee | Books and study materials |
| Exam Fee | Test and assessment charges |
| Other Charges | Lab, library, etc. |

### 7.2 Viewing Fee Records

**Navigation:** Dashboard → Fees

**Filter Options:**
- By student name
- By batch
- By payment status (Paid/Pending/Partial)
- By date range

### 7.3 Recording a Payment

1. Find the student fee record
2. Click **"Record Payment"**
3. Enter:
   - Amount Received *
   - Payment Date *
   - Payment Mode (Cash/Card/UPI/Bank Transfer/Cheque)
   - Transaction Reference
   - Remarks
4. Click **"Save Payment"**
5. Receipt is auto-generated

### 7.4 Payment Status Types

| Status | Description |
|--------|-------------|
| **Paid** | Full amount received |
| **Pending** | No payment received |
| **Partial** | Some amount received |
| **Overdue** | Past due date |

### 7.5 Generating Fee Reports

1. Go to **Reports** → **Fee Reports**
2. Select report type:
   - Collection Summary
   - Outstanding Report
   - Payment Mode Analysis
3. Set date range
4. Click **"Generate"**
5. Export to PDF/Excel

### 7.6 Fee Reminders

**Automatic Reminders:**
- Sent 7 days before due date
- Sent on due date
- Sent 3 days after overdue
- Sent weekly for long overdue

**Manual Reminder:**
1. Select student(s)
2. Click **"Send Reminder"**
3. Choose channel (SMS/Email/WhatsApp)
4. Customize message (optional)
5. Send

---

## 8. Attendance Management

### 8.1 Marking Attendance

**Navigation:** Dashboard → Attendance

**Quick Mark Method:**
1. Select Date (defaults to today)
2. Select Batch
3. Student list appears
4. Click Present (P), Absent (A), or Late (L) for each
5. Click **"Submit Attendance"**

### 8.2 Attendance Status Options

| Status | Code | Description |
|--------|------|-------------|
| Present | P | Student attended class |
| Absent | A | Student did not attend |
| Late | L | Arrived after grace period |
| Half Day | H | Present for partial day |
| Leave | LV | Pre-approved absence |

### 8.3 Viewing Attendance Records

**Individual Student:**
1. Go to Student Profile → Attendance Tab
2. View monthly calendar
3. See attendance percentage
4. Download attendance certificate

**Batch-wise:**
1. Go to Attendance → Reports
2. Select batch and date range
3. View summary statistics
4. Export detailed report

### 8.4 Attendance Alerts

System automatically sends alerts when:
- Student is absent for 3+ consecutive days
- Attendance falls below 75%
- Student marked late frequently

### 8.5 Editing Past Attendance

1. Navigate to the specific date
2. Click **"Edit"** icon
3. Change the status
4. Add reason for change
5. Save (requires admin approval if >24 hours old)

---

## 9. Exam Management

### 9.1 Types of Examinations

| Type | Description | Frequency |
|------|-------------|-----------|
| **Unit Test** | Chapter-wise tests | Weekly |
| **Weekly Test** | Comprehensive weekly | Weekly |
| **Monthly Test** | Full syllabus | Monthly |
| **Mock Exam** | Simulation of actual exam | Bi-weekly |
| **Final Exam** | Course completion | End of course |

### 9.2 Creating an Exam

1. Go to **Exams** → **Create Exam**
2. Enter exam details:
   - Exam Name *
   - Exam Type *
   - Subject *
   - Batch(es) *
   - Date and Time *
   - Duration (minutes) *
   - Maximum Marks *
   - Passing Marks
   - Syllabus/Topics
3. Save the exam

### 9.3 Entering Exam Results

**Individual Entry:**
1. Go to the exam
2. Click **"Enter Results"**
3. Enter marks for each student
4. Save

**Bulk Upload:**
1. Download the template (Excel)
2. Fill in the marks
3. Upload the completed file
4. Review and confirm
5. Save results

### 9.4 Viewing Results

**Student View:**
- See scores for all exams
- View rank and percentile
- Compare with class average
- Track progress over time

**Analytics View:**
- Class-wise performance
- Subject-wise analysis
- Top performers
- Students needing attention

### 9.5 Publishing Results

1. After all marks are entered
2. Click **"Review Results"**
3. Verify the data
4. Click **"Publish"**
5. Students and parents receive notifications

---

## 10. Performance Analytics

### 10.1 Dashboard Analytics

The performance dashboard shows:

- **Overall Performance:** Institute-wide statistics
- **Batch Comparison:** Compare different batches
- **Subject Analysis:** Strong and weak subjects
- **Trend Analysis:** Performance over time

### 10.2 Individual Student Analytics

Access via Student Profile → Performance Tab:

| Metric | Description |
|--------|-------------|
| Overall Score | Weighted average of all exams |
| Rank | Position in batch |
| Percentile | Performance compared to peers |
| Progress | Improvement/decline trend |
| Predictions | Expected performance |

### 10.3 Charts Available

1. **Line Chart:** Score trends over time
2. **Bar Chart:** Subject-wise comparison
3. **Radar Chart:** Skill assessment
4. **Pie Chart:** Topic distribution

### 10.4 Generating Performance Reports

1. Go to **Reports** → **Performance**
2. Select parameters:
   - Student(s) or Batch
   - Date range
   - Subjects
3. Click **"Generate"**
4. View on screen or export

---

## 11. Admissions Module

### 11.1 Inquiry Management

**Capturing a New Inquiry:**

1. Go to **Admissions** → **New Inquiry**
2. Enter prospect details:
   - Name *
   - Phone *
   - Email
   - Interested Course *
   - Source (Walk-in/Website/Call/Referral)
   - Remarks
3. Save inquiry

### 11.2 Inquiry Follow-up

1. View inquiry list
2. Click on an inquiry
3. Add follow-up note:
   - Call outcome
   - Next action date
   - Notes
4. Update inquiry status

### 11.3 Inquiry Status Flow

```
New → Contacted → Interested → Demo Scheduled → Demo Done → Converted/Lost
```

| Status | Action Required |
|--------|-----------------|
| New | Contact within 24 hours |
| Contacted | Schedule follow-up |
| Interested | Arrange demo/counseling |
| Demo Scheduled | Confirm attendance |
| Demo Done | Close conversion |
| Converted | Create student record |
| Lost | Document reason |

### 11.4 Converting Inquiry to Admission

1. Open the qualified inquiry
2. Click **"Convert to Student"**
3. Complete additional details
4. Generate fee quote
5. Confirm admission
6. System creates:
   - Student record
   - Fee schedule
   - Batch assignment
   - Welcome notification

---

## 12. Reports & Analytics

### 12.1 Available Reports

| Report Category | Reports Available |
|----------------|-------------------|
| **Student Reports** | Student List, Attendance Summary, Fee Status |
| **Fee Reports** | Collection Report, Outstanding Report, Daily Collection |
| **Academic Reports** | Exam Results, Performance Analysis, Progress Report |
| **Operational Reports** | Batch Utilization, Faculty Workload, Inquiry Pipeline |

### 12.2 Generating Reports

1. Navigate to **Reports** section
2. Select report category
3. Choose specific report
4. Set parameters:
   - Date range
   - Filters (batch, course, etc.)
   - Grouping options
5. Click **"Generate"**

### 12.3 Export Options

| Format | Best For |
|--------|----------|
| **PDF** | Printing, sharing, official records |
| **Excel** | Further analysis, manipulation |
| **CSV** | Data import to other systems |

### 12.4 Scheduled Reports

Set up automatic report generation:

1. Go to **Reports** → **Scheduled Reports**
2. Click **"Add Schedule"**
3. Configure:
   - Report type
   - Frequency (Daily/Weekly/Monthly)
   - Recipients (email addresses)
   - Time of delivery
4. Save schedule

---

## 13. Notification System

### 13.1 Notification Channels

| Channel | Use Case |
|---------|----------|
| **In-App** | System alerts, internal communication |
| **SMS** | Urgent updates, reminders |
| **Email** | Detailed communications, reports |
| **WhatsApp** | Quick updates, media sharing |

### 13.2 Sending Notifications

**Individual Notification:**
1. Go to **Notifications** → **Send New**
2. Select recipient(s)
3. Choose channel(s)
4. Enter subject and message
5. Attach files if needed
6. Send immediately or schedule

**Bulk Notification:**
1. Select target group (batch/course/all)
2. Compose message
3. Preview
4. Send

### 13.3 Notification Templates

Pre-configured templates for:
- Fee reminders
- Attendance alerts
- Exam notifications
- Holiday announcements
- General updates

**Using Templates:**
1. Click **"Use Template"**
2. Select template
3. Customize if needed
4. Send

### 13.4 Notification History

View all sent notifications:
- Date and time sent
- Recipients
- Delivery status
- Read receipts (where available)

---

## 14. Parent Portal

### 14.1 Parent Access

Parents receive separate login credentials to:
- View their child's attendance
- Check exam scores
- See fee status
- Receive notifications
- Communicate with faculty

### 14.2 Parent Dashboard

Shows for linked student:
- Today's attendance
- Recent exam scores
- Pending fees
- Upcoming exams
- Announcements

### 14.3 Parent Features

| Feature | Description |
|---------|-------------|
| **Attendance View** | Monthly calendar with status |
| **Performance View** | Exam scores and trends |
| **Fee View** | Payment history and dues |
| **Communication** | Message faculty/admin |
| **Documents** | Download reports, receipts |

---

## 15. Settings & Configuration

### 15.1 Profile Settings

**Update Your Profile:**
1. Click profile icon → **"Settings"**
2. Edit:
   - Display name
   - Phone number
   - Email (requires verification)
   - Profile photo
3. Save changes

### 15.2 Security Settings

**Change Password:**
1. Go to Settings → Security
2. Enter current password
3. Enter new password (twice)
4. Save

**MFA Management:**
- Enable/disable MFA
- Regenerate backup codes
- Change authenticator app

### 15.3 Notification Preferences

Customize which notifications you receive:

| Notification Type | In-App | Email | SMS |
|-------------------|--------|-------|-----|
| Fee Reminders | ✅/❌ | ✅/❌ | ✅/❌ |
| Attendance Alerts | ✅/❌ | ✅/❌ | ✅/❌ |
| Exam Notifications | ✅/❌ | ✅/❌ | ✅/❌ |
| System Updates | ✅/❌ | ✅/❌ | ✅/❌ |

### 15.4 System Settings (Admin Only)

- Institute Information
- Academic Year Configuration
- Fee Structure Management
- User Role Management
- Integration Settings
- Backup & Recovery

---

## 16. Frequently Asked Questions (FAQs)

### General Questions

**Q: I forgot my password. How do I reset it?**  
A: Click "Forgot Password" on the login page. Enter your registered email, and you'll receive a reset link valid for 1 hour.

**Q: Why can't I login even with correct credentials?**  
A: Check if:
- Caps Lock is on
- You're using the correct email
- Your account is active (contact admin)
- You need to complete MFA

**Q: How do I change my email address?**  
A: Go to Settings → Profile → Edit Email. A verification link will be sent to the new email.

**Q: Can I access the system on mobile?**  
A: Yes, the system is responsive and works on mobile browsers. A native app may be available separately.

---

### Student Management FAQs

**Q: How do I transfer a student to a different batch?**  
A: Go to Student Profile → Click "Transfer Batch" → Select new batch → Confirm. This preserves all history.

**Q: Can I delete a student record?**  
A: No, student records cannot be deleted to maintain data integrity. You can change status to "Dropped" or "Inactive."

**Q: How do I add multiple students at once?**  
A: Use the bulk import feature:
1. Download the Excel template
2. Fill student data
3. Upload the file
4. Review and confirm

**Q: What happens when a student's status is changed to "Dropped"?**  
A: 
- Student is removed from active lists
- Access is disabled
- Historical data is preserved
- Fee dues remain until cleared

---

### Fee Management FAQs

**Q: Can I record a partial payment?**  
A: Yes, enter the amount received. The system automatically updates the balance and marks as "Partial."

**Q: How do I generate a fee receipt?**  
A: After recording payment, click "Print Receipt" or go to Student Profile → Fees → View Receipt.

**Q: Can I edit a payment after recording?**  
A: Only admins can edit payments. Go to the payment record → Edit → Make changes → Save with reason.

**Q: How do fee reminders work?**  
A: Automatic reminders are sent:
- 7 days before due date
- On due date
- 3 days after due
- Weekly for overdue

**Q: Can I offer discounts?**  
A: Yes, when creating fee record:
- Add discount amount or percentage
- Select discount reason
- Approve (admin only for large discounts)

---

### Attendance FAQs

**Q: Can I mark attendance for a past date?**  
A: Yes, but:
- Within 24 hours: Any authorized user
- After 24 hours: Requires admin approval

**Q: What if a student arrives late?**  
A: Mark as "Late (L)". Late arrival can be configured to:
- Count as half-day after X minutes
- Count as absent after Y minutes

**Q: How is attendance percentage calculated?**  
A: `(Present Days + Late Days*0.5) / Total Working Days * 100`

**Q: Can students mark their own attendance?**  
A: This depends on system configuration. If enabled, geolocation/IP verification may be required.

---

### Exam & Performance FAQs

**Q: Can I change marks after publishing results?**  
A: Yes, with admin privileges:
1. Go to exam results
2. Click "Edit Results"
3. Make changes
4. Add reason
5. Re-publish

**Q: How are ranks calculated?**  
A: Based on total marks obtained. Ties are handled by:
1. Higher marks in priority subject
2. Fewer negative marks
3. Alphabetical order

**Q: Can students see their answer sheets?**  
A: If enabled, students can view scanned copies or detailed solutions through the portal.

**Q: What's the difference between score and grade?**  
A: 
- **Score**: Actual marks obtained
- **Grade**: Letter grade based on score ranges (A, B, C, etc.)

---

### Notification FAQs

**Q: Why aren't my notifications being delivered?**  
A: Check:
- Recipient contact details are correct
- SMS balance is available
- Email not in spam folder
- WhatsApp Business API is configured

**Q: Can I unsend a notification?**  
A: No, sent notifications cannot be recalled. Send a correction message if needed.

**Q: How do I stop receiving certain notifications?**  
A: Go to Settings → Notification Preferences → Toggle off unwanted notification types.

---

### Technical FAQs

**Q: The page is loading slowly. What should I do?**  
A:
1. Check your internet connection
2. Clear browser cache
3. Try a different browser
4. Contact support if issue persists

**Q: I see an error message. What should I do?**  
A:
1. Note the error message and code
2. Take a screenshot
3. Try refreshing the page
4. Contact support with details

**Q: Why did my session expire?**  
A: Sessions expire after 8 hours of inactivity for security. Simply log in again.

**Q: Can I use the system offline?**  
A: No, an active internet connection is required. Some data may be cached for brief disconnections.

---

## 17. Troubleshooting Guide

### Common Issues and Solutions

#### Login Issues

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| "Invalid credentials" | Wrong password | Reset password |
| "Account locked" | Too many failed attempts | Wait 30 mins or contact admin |
| "Session expired" | Inactivity timeout | Login again |
| MFA code rejected | Time sync issue | Sync phone time with internet |

#### Performance Issues

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| Slow loading | Large data set | Use filters to narrow results |
| Page not responding | Browser cache | Clear cache and reload |
| Charts not displaying | JavaScript disabled | Enable JavaScript |
| Export failing | Large file size | Reduce date range |

#### Data Issues

| Problem | Possible Cause | Solution |
|---------|---------------|----------|
| Missing records | Filter applied | Clear all filters |
| Incorrect totals | Cached data | Refresh the page |
| Duplicate entries | Double submission | Contact admin to merge |
| Data mismatch | Sync delay | Wait and refresh |

### Error Codes Reference

| Error Code | Meaning | Action |
|------------|---------|--------|
| 401 | Unauthorized | Login again |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Check URL |
| 500 | Server Error | Contact support |
| 503 | Service Unavailable | Wait and retry |

### Browser-Specific Issues

**Chrome:**
- Enable cookies: Settings → Privacy → Cookies → Allow
- Clear cache: Ctrl+Shift+Delete

**Firefox:**
- Enable JavaScript: about:config → javascript.enabled
- Clear cache: Ctrl+Shift+Delete

**Safari:**
- Enable cookies: Preferences → Privacy → Cookies
- Clear cache: Safari → Clear History

---

## 18. Keyboard Shortcuts

### Navigation Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + H` | Go to Home/Dashboard |
| `Alt + S` | Go to Students |
| `Alt + F` | Go to Faculty |
| `Alt + B` | Go to Batches |
| `Alt + A` | Go to Attendance |
| `Alt + E` | Go to Exams |
| `Alt + R` | Go to Reports |

### Action Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New record |
| `Ctrl + S` | Save |
| `Ctrl + F` | Search |
| `Ctrl + P` | Print |
| `Escape` | Close modal/popup |

### Table Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑/↓` | Navigate rows |
| `Enter` | Open selected record |
| `Ctrl + A` | Select all |
| `Delete` | Delete selected (if allowed) |

---

## 19. Glossary of Terms

| Term | Definition |
|------|------------|
| **Batch** | A group of students studying the same course together |
| **Course** | A program of study offered by the institute |
| **Enrollment** | The process of registering a student for a course |
| **Fee Schedule** | The payment plan for course fees |
| **Inquiry** | A potential student interested in joining |
| **Installment** | A partial payment of the total fee |
| **MFA** | Multi-Factor Authentication for enhanced security |
| **Performance** | Academic progress measured through exams |
| **Portal** | Web-based access point for users |
| **Prospect** | A potential student before enrollment |
| **Session** | A logged-in period in the system |
| **Syllabus** | Course curriculum and topics |
| **Transcript** | Official record of academic performance |

---

## 20. Support & Contact

### Getting Help

**Level 1 - Self Help:**
- Review this user manual
- Check the FAQs section
- Search knowledge base

**Level 2 - Contact Support:**
- Email: support@eduprime.com
- Phone: +91-XXXX-XXXXXX
- Hours: Mon-Sat, 9 AM - 6 PM IST

**Level 3 - Escalation:**
- For critical issues
- Email: escalation@eduprime.com

### When Contacting Support

Please provide:
1. Your name and user ID
2. Description of the issue
3. Steps to reproduce
4. Screenshots (if applicable)
5. Error messages (if any)
6. Browser and device information

### Support Response Times

| Priority | Response Time | Examples |
|----------|---------------|----------|
| Critical | 1 hour | System down, data loss |
| High | 4 hours | Feature not working |
| Medium | 24 hours | Slow performance |
| Low | 48 hours | Questions, suggestions |

### Feedback & Suggestions

We value your feedback! Submit suggestions:
- In-app: Help → Feedback
- Email: feedback@eduprime.com

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2025 | Initial release |

---

**© 2025 EduPrime Institute Management System. All Rights Reserved.**

*This manual is for authorized users only. Unauthorized distribution is prohibited.*
