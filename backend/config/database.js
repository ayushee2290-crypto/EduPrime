const { Pool } = require('pg');
const logger = require('./logger');

// Create connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'eduprime',
    user: process.env.DB_USER || 'eduprime_user',
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Connection test
async function connectDatabase() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        logger.info(`Database connected at: ${result.rows[0].now}`);
        client.release();
        return true;
    } catch (error) {
        logger.error('Database connection error:', error);
        throw error;
    }
}

// Query helper with error handling
async function query(text, params) {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        
        if (process.env.NODE_ENV === 'development') {
            logger.debug(`Query executed in ${duration}ms`, { 
                query: text.substring(0, 100),
                rows: result.rowCount 
            });
        }
        
        return result;
    } catch (error) {
        logger.error('Query error:', { error: error.message, query: text });
        throw error;
    }
}

// Transaction helper
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Get single record
async function getOne(text, params) {
    const result = await query(text, params);
    return result.rows[0] || null;
}

// Get multiple records
async function getMany(text, params) {
    const result = await query(text, params);
    return result.rows;
}

// Insert and return
async function insert(text, params) {
    const result = await query(text, params);
    return result.rows[0];
}

// Update and return count
async function update(text, params) {
    const result = await query(text, params);
    return result.rowCount;
}

// Delete and return count
async function remove(text, params) {
    const result = await query(text, params);
    return result.rowCount;
}

module.exports = {
    pool,
    query,
    transaction,
    getOne,
    getMany,
    insert,
    update,
    remove,
    connectDatabase
};
