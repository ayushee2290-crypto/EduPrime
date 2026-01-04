require('dotenv').config();

const { createApp } = require('./app');

// Import services
const { initializeScheduledJobs } = require('./automation/scheduledJobs');
const logger = require('./config/logger');
const { connectDatabase } = require('./config/database');

const app = createApp();

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
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = app;
