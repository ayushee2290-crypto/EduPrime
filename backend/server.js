require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import routes
const studentRoutes = require('./routes/students');
const facultyRoutes = require('./routes/faculty');
const batchRoutes = require('./routes/batches');
const feeRoutes = require('./routes/fees');
const attendanceRoutes = require('./routes/attendance');
const examRoutes = require('./routes/exams');
const admissionRoutes = require('./routes/admissions');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const authRoutes = require('./routes/auth');
const mfaRoutes = require('./routes/mfa');
const academicRoutes = require('./routes/academic');
const performanceRoutes = require('./routes/performance');
const parentRoutes = require('./routes/parent');

// Import services
const { initializeScheduledJobs } = require('./automation/scheduledJobs');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');

const app = express();

// ===========================================
// MIDDLEWARE CONFIGURATION
// ===========================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Disable for dashboard
}));

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: { write: message => logger.info(message.trim()) }
    }));
}

// Static files (for dashboard)
app.use(express.static(path.join(__dirname, 'frontend')));

// Serve dashboard at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// ===========================================
// API ROUTES
// ===========================================

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'EduPrime API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// API Info
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to EduPrime API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            students: '/api/students',
            faculty: '/api/faculty',
            batches: '/api/batches',
            fees: '/api/fees',
            attendance: '/api/attendance',
            exams: '/api/exams',
            admissions: '/api/admissions',
            dashboard: '/api/dashboard',
            notifications: '/api/notifications'
        }
    });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/parent', parentRoutes);

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dashboard.html'));
});

// ===========================================
// ERROR HANDLING
// ===========================================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error(`Error: ${err.message}`, {
        stack: err.stack,
        path: req.path,
        method: req.method
    });

    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// ===========================================
// SERVER INITIALIZATION
// ===========================================

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Connect to database
        await connectDatabase();
        logger.info('✅ Database connected successfully');

        // Initialize scheduled jobs
        if (process.env.NODE_ENV !== 'test') {
            initializeScheduledJobs();
            logger.info('✅ Scheduled jobs initialized');
        }

        // Start server
        app.listen(PORT, () => {
            logger.info(`🚀 EduPrime API Server running on port ${PORT}`);
            logger.info(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
            logger.info(`📡 API: http://localhost:${PORT}/api`);
            logger.info(`❤️  Health: http://localhost:${PORT}/health`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
