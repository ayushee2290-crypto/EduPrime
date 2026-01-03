# EduPrime - Coaching Institute Management System 🎓

A comprehensive, automated management system for premium coaching institutes offering Class 9-12, IIT-JEE, and NEET preparation.

## 🌟 Features

### 📚 Module 1: Student & Academic Management
- Student registration and enrollment
- Batch allocation and upgrades
- Course management (Class 9-12, IIT-JEE, NEET, Foundation)
- Syllabus tracking

### 💰 Module 2: Fee Management System
- Automated fee reminders (WhatsApp/SMS/Email)
- Installment tracking
- Payment gateway integration
- Receipt generation
- Outstanding dues reports

### 🎓 Module 3: Admission Counselor (24/7)
- Automated inquiry handling
- Lead capture and CRM
- Course information delivery
- Appointment scheduling
- Follow-up automation

### 📊 Module 4: Performance Analytics
- Test and exam management
- Result publishing
- Weak-area analysis
- Personalized study recommendations
- Parent progress reports
- Rank tracking

### 👨‍🏫 Module 5: Faculty & Timetable Management
- Faculty scheduling
- Workload distribution
- Syllabus completion tracking
- Substitute assignment
- Daily reports

### ✅ Module 6: Attendance & Alerts
- Digital attendance tracking
- Real-time parent notifications
- Low-attendance alerts
- Monthly reports

### 📈 Module 7: Management Dashboard
- Real-time KPIs
- Revenue analytics
- Batch performance
- Dropout risk indicators
- Decision support insights

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| Automation | n8n (workflow automation) |
| Notifications | WhatsApp Business API, Twilio SMS, Nodemailer |
| Payment | Razorpay |
| Frontend | HTML5, CSS3, JavaScript, Chart.js |
| Containerization | Docker |

---

## 📁 Project Structure

```
EduPrime/
├── README.md
├── docker-compose.yml
├── .env.example
├── database/
│   └── schema.sql
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── config/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── automation/
├── frontend/
│   └── dashboard.html
├── n8n-workflows/
│   └── *.json
└── docs/
    └── *.md
```

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (or use Docker)

### 1. Clone & Configure

```bash
cd EduPrime
cp .env.example .env
# Edit .env with your configuration
```

### 2. Start with Docker

```bash
docker-compose up -d
```

### 3. Access Services

| Service | URL |
|---------|-----|
| Backend API | http://localhost:3000 |
| Admin Dashboard | http://localhost:3000/dashboard |
| n8n Automation | http://localhost:5678 |
| PostgreSQL | localhost:5432 |

---

## 📡 API Endpoints

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/students | List all students |
| POST | /api/students | Register new student |
| GET | /api/students/:id | Get student details |
| PUT | /api/students/:id | Update student |
| GET | /api/students/:id/performance | Get performance report |

### Fees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/fees/pending | List pending fees |
| POST | /api/fees/payment | Record payment |
| GET | /api/fees/receipt/:id | Generate receipt |
| POST | /api/fees/remind | Trigger reminders |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/attendance/mark | Mark attendance |
| GET | /api/attendance/report | Get attendance report |
| GET | /api/attendance/alerts | Get low-attendance alerts |

### Exams & Results
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/exams | Create exam |
| POST | /api/results | Upload results |
| GET | /api/results/analytics | Get performance analytics |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/dashboard/overview | KPI overview |
| GET | /api/dashboard/revenue | Revenue analytics |
| GET | /api/dashboard/performance | Batch performance |
| GET | /api/dashboard/risks | Risk indicators |

---

## ⚙️ Configuration

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eduprime
DB_USER=eduprime_user
DB_PASSWORD=your_secure_password

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your_jwt_secret

# WhatsApp Business API
WHATSAPP_API_URL=https://graph.facebook.com/v17.0
WHATSAPP_PHONE_ID=your_phone_id
WHATSAPP_TOKEN=your_access_token

# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE=+1234567890

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret

# n8n
N8N_WEBHOOK_URL=http://localhost:5678/webhook
```

---

## 📅 Automation Schedules

| Job | Schedule | Description |
|-----|----------|-------------|
| Fee Reminders | Daily 9 AM | Send payment reminders |
| Attendance Alerts | Daily 7 PM | Notify parents of absent students |
| Daily Reports | Daily 8 PM | Send admin summary |
| Weekly Reports | Sunday 6 PM | Performance summaries |
| Monthly Reports | 1st of month | Revenue & analytics |

---

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (Admin, Faculty, Student, Parent)
- Data encryption at rest
- API rate limiting
- Input validation & sanitization
- CORS protection

---

## 📞 Support

For implementation support or customization:
- Create an issue in the repository
- Contact: admin@eduprime.institute

---

## 📄 License

MIT License - See LICENSE file for details.

---

**Built with ❤️ for Premium Coaching Institutes**
