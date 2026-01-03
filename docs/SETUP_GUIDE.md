# EduPrime Setup Guide

This guide will walk you through setting up the EduPrime Institute Management System from scratch.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Docker & Docker Compose** - [Download](https://www.docker.com/)
- **Git** - [Download](https://git-scm.com/)

### Optional Services (for full functionality)
- **Twilio Account** - For SMS notifications
- **WhatsApp Business API** - For WhatsApp messages
- **SMTP Server** - For email notifications (Gmail, SendGrid, etc.)

---

## Quick Start (Docker)

The fastest way to get started is using Docker:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/eduprime.git
cd eduprime

# 2. Copy environment file
cp .env.example .env

# 3. Edit .env with your settings
nano .env

# 4. Start all services
docker-compose up -d

# 5. Access the application
# Dashboard: http://localhost:3000
# API: http://localhost:3000/api
# n8n (Workflows): http://localhost:5678
```

---

## Manual Setup

### Step 1: Database Setup

#### Using Docker (Recommended)
```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis
```

#### Manual PostgreSQL Installation
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql

# Create database
psql -U postgres
CREATE DATABASE eduprime;
CREATE USER eduprime_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE eduprime TO eduprime_user;
\q
```

#### Initialize Database Schema
```bash
# Run the schema file
psql -U eduprime_user -d eduprime -f database/schema.sql
```

---

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

#### Configure Environment Variables

Edit the `.env` file with your settings:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://eduprime_user:your_password@localhost:5432/eduprime
REDIS_URL=redis://localhost:6379

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_EMAIL=noreply@eduprime.edu

# Admin Settings
ADMIN_EMAIL=admin@eduprime.edu
ADMIN_WHATSAPP=+919876543210
```

#### Start the Backend
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

---

### Step 3: n8n Setup (Workflow Automation)

n8n powers the automated workflows for fee reminders, attendance alerts, and reports.

```bash
# Start n8n with Docker
docker-compose up -d n8n

# Or install globally
npm install -g n8n
n8n start
```

#### Import Workflows

1. Open n8n at `http://localhost:5678`
2. Go to **Workflows** → **Import from File**
3. Import each workflow from `n8n-workflows/`:
   - `fee-reminders.json`
   - `attendance-alerts.json`
   - `inquiry-followup.json`
   - `daily-report.json`

#### Configure n8n Credentials

1. Go to **Credentials** in n8n
2. Add the following credentials:

**PostgreSQL:**
- Name: `EduPrime PostgreSQL`
- Host: `localhost` (or `postgres` if using Docker)
- Port: `5432`
- Database: `eduprime`
- User: `eduprime_user`
- Password: Your password

**WhatsApp Business API:**
- Name: `WhatsApp Business API`
- Access Token: Your WhatsApp token
- Phone Number ID: Your phone number ID

**SMTP:**
- Name: `EduPrime SMTP`
- Host: Your SMTP host
- Port: 587
- User: Your email
- Password: Your app password

---

### Step 4: Frontend Setup

The dashboard is a static HTML file that connects to the API.

```bash
# Serve with any HTTP server
cd frontend

# Using Python
python -m http.server 8080

# Using Node.js
npx serve

# Or use the built-in static serving from Express
# (already configured in backend/server.js)
```

Access the dashboard at `http://localhost:3000` (served by Express) or `http://localhost:8080` (standalone).

---

## Configuration Guide

### Notification Channels

#### WhatsApp Business API Setup

1. Create a Meta Business Account at [business.facebook.com](https://business.facebook.com)
2. Go to **WhatsApp** → **Getting Started**
3. Create a WhatsApp Business App
4. Get your:
   - Phone Number ID
   - Access Token
5. Add these to your `.env` file

#### Twilio SMS Setup

1. Sign up at [twilio.com](https://www.twilio.com)
2. Get your:
   - Account SID
   - Auth Token
   - Phone Number
3. Add these to your `.env` file

#### Email (Gmail) Setup

1. Enable 2-Factor Authentication on your Gmail account
2. Go to **Google Account** → **Security** → **App Passwords**
3. Generate an app password for "Mail"
4. Use this password in your `.env` file

---

### Scheduled Jobs Configuration

The system uses `node-cron` for scheduled tasks. Default schedules:

| Job | Schedule | Description |
|-----|----------|-------------|
| Fee Reminders | 9:00 AM daily | Send fee due reminders |
| Attendance Alerts (AM) | 10:00 AM daily | Check morning attendance |
| Attendance Alerts (PM) | 5:00 PM daily | Send absence notifications |
| Daily Report | 6:00 PM daily | Generate & send daily summary |
| Weekly Analytics | Sunday 8:00 AM | Generate weekly performance report |

To modify schedules, edit `backend/automation/scheduledJobs.js`.

---

## Production Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose -f docker-compose.yml up -d --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000

# Use strong secrets
JWT_SECRET=generate-a-very-long-random-string-here

# Database (use managed database in production)
DATABASE_URL=postgresql://user:pass@your-db-host:5432/eduprime

# Enable SSL
SSL_ENABLED=true
```

### Nginx Configuration (Optional)

```nginx
server {
    listen 80;
    server_name eduprime.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name eduprime.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps
# or
pg_isready -h localhost -p 5432

# Check database exists
psql -U postgres -c "\l"
```

#### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG
```

#### n8n Workflows Not Running
1. Check if workflows are activated (toggle should be ON)
2. Verify credentials are correctly configured
3. Check n8n logs: `docker-compose logs n8n`

#### WhatsApp Messages Not Sending
1. Verify your WhatsApp Business API credentials
2. Check if phone numbers are in correct format (+91XXXXXXXXXX)
3. Ensure your WhatsApp Business account is approved

#### Emails Not Sending
1. Check SMTP credentials
2. For Gmail, ensure you're using an App Password
3. Check if port 587 is not blocked

---

## Security Best Practices

1. **Change Default Passwords**: Update all default passwords in production
2. **Use HTTPS**: Always use SSL/TLS in production
3. **Secure JWT Secret**: Use a long, random string (min 32 characters)
4. **Database Security**: Use strong passwords, restrict access
5. **Environment Variables**: Never commit `.env` files to version control
6. **Regular Backups**: Set up automated database backups
7. **Rate Limiting**: Already configured in the API
8. **Input Validation**: All inputs are validated and sanitized

---

## Support

For issues and feature requests:
- GitHub Issues: [github.com/your-org/eduprime/issues](https://github.com/your-org/eduprime/issues)
- Email: support@eduprime.edu
- Documentation: [docs.eduprime.edu](https://docs.eduprime.edu)

---

## License

MIT License - see LICENSE file for details.
