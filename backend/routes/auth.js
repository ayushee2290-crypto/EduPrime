const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const db = require('../config/database');
const logger = require('../config/logger');

// Register user
router.post('/register', async (req, res) => {
    try {
        const { email, phone, password, role = 'student' } = req.body;

        // Validate input
        if (!email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email, phone and password are required'
            });
        }

        // Check if user exists
        const existingUser = await db.getOne(
            'SELECT id FROM users WHERE email = $1 OR phone = $2',
            [email, phone]
        );

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'User with this email or phone already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Create user
        const user = await db.insert(
            `INSERT INTO users (email, phone, password_hash, role) 
             VALUES ($1, $2, $3, $4) RETURNING id, email, phone, role, created_at`,
            [email, phone, passwordHash, role]
        );

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: { user, token }
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, phone, password } = req.body;

        if ((!email && !phone) || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email/phone and password are required'
            });
        }

        // Find user
        const user = await db.getOne(
            'SELECT * FROM users WHERE email = $1 OR phone = $2',
            [email || '', phone || '']
        );

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact admin.'
            });
        }

        // Check if MFA is enabled
        if (user.mfa_enabled) {
            // Generate a temporary token for MFA verification
            const mfaToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role, mfaPending: true },
                process.env.JWT_SECRET,
                { expiresIn: '5m' } // Short-lived token for MFA
            );

            return res.json({
                success: true,
                message: 'MFA verification required',
                data: {
                    mfaRequired: true,
                    mfaToken
                }
            });
        }

        // Update last login
        await db.update(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    mfaEnabled: false
                },
                token
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
});

// MFA Login Verification
router.post('/login/mfa', async (req, res) => {
    try {
        const { mfaToken, totpCode, backupCode } = req.body;

        if (!mfaToken || (!totpCode && !backupCode)) {
            return res.status(400).json({
                success: false,
                message: 'MFA token and verification code are required'
            });
        }

        // Verify the MFA token
        let decoded;
        try {
            decoded = jwt.verify(mfaToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({
                success: false,
                message: 'MFA session expired. Please login again.'
            });
        }

        if (!decoded.mfaPending) {
            return res.status(401).json({
                success: false,
                message: 'Invalid MFA token'
            });
        }

        // Get user
        const user = await db.getOne(
            'SELECT * FROM users WHERE id = $1',
            [decoded.id]
        );

        if (!user || !user.mfa_enabled) {
            return res.status(401).json({
                success: false,
                message: 'Invalid user or MFA not enabled'
            });
        }

        let verified = false;

        // Verify TOTP code
        if (totpCode) {
            verified = speakeasy.totp.verify({
                secret: user.mfa_secret,
                encoding: 'base32',
                token: totpCode,
                window: 2
            });
        }

        // Verify backup code if TOTP didn't work
        if (!verified && backupCode) {
            const backupCodes = user.mfa_backup_codes || [];
            const codeIndex = backupCodes.indexOf(backupCode);
            if (codeIndex !== -1) {
                // Remove used backup code
                backupCodes.splice(codeIndex, 1);
                await db.update(
                    'UPDATE users SET mfa_backup_codes = $1::text[] WHERE id = $2',
                    [backupCodes, user.id]
                );
                verified = true;
            }
        }

        if (!verified) {
            return res.status(401).json({
                success: false,
                message: 'Invalid verification code'
            });
        }

        // Update last login
        await db.update(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // Generate full access token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'MFA verification successful',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    mfaEnabled: true
                },
                token
            }
        });

    } catch (error) {
        logger.error('MFA login error:', error);
        res.status(500).json({
            success: false,
            message: 'MFA verification failed',
            error: error.message
        });
    }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.getOne(
            'SELECT id, email, phone, role, is_active, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });

    } catch (error) {
        logger.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user',
            error: error.message
        });
    }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current and new password are required'
            });
        }

        // Get user
        const user = await db.getOne('SELECT * FROM users WHERE id = $1', [req.user.id]);

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        await db.update(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [passwordHash, req.user.id]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password',
            error: error.message
        });
    }
});

// Middleware to authenticate token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
        req.user = user;
        next();
    });
}

// Middleware to check role
function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'You do not have permission to perform this action'
            });
        }
        next();
    };
}

// Export middleware for use in other routes
module.exports = router;
module.exports.authenticateToken = authenticateToken;
module.exports.authorizeRoles = authorizeRoles;
