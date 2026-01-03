const express = require('express');
const router = express.Router();
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../config/logger');
const { authenticateToken } = require('./auth');

// Generate MFA secret and QR code for setup
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user is admin
    const user = await db.getOne(
      'SELECT email, role, mfa_enabled FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (user.mfa_enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'MFA is already enabled for this account' 
      });
    }
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `EduPrime (${user.email})`,
      issuer: 'EduPrime Institute',
      length: 20
    });
    
    // Store secret temporarily (not enabled yet)
    await db.update(
      'UPDATE users SET mfa_secret = $1 WHERE id = $2',
      [secret.base32, userId]
    );
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    res.json({
      success: true,
      message: 'MFA setup initiated. Scan the QR code with your authenticator app.',
      data: {
        qrCode: qrCodeUrl,
        manualKey: secret.base32,
        instructions: [
          '1. Download Google Authenticator or Authy app',
          '2. Scan the QR code or enter the manual key',
          '3. Enter the 6-digit code to verify and enable MFA'
        ]
      }
    });
    
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({ success: false, message: 'MFA setup failed' });
  }
});

// Verify and enable MFA
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification token is required' 
      });
    }
    
    // Get user's MFA secret
    const user = await db.getOne(
      'SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.mfa_secret) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please initiate MFA setup first' 
      });
    }
    
    if (user.mfa_enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'MFA is already enabled' 
      });
    }
    
    // Verify the token
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps tolerance
    });
    
    if (!verified) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code. Please try again.' 
      });
    }
    
    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    
    // Enable MFA and store backup codes (PostgreSQL array format)
    await db.update(
      'UPDATE users SET mfa_enabled = true, mfa_backup_codes = $1::text[] WHERE id = $2',
      [backupCodes, userId]
    );
    
    logger.info(`MFA enabled for user: ${userId}`);
    
    res.json({
      success: true,
      message: 'MFA has been enabled successfully!',
      data: {
        backupCodes: backupCodes,
        warning: 'Save these backup codes in a safe place. Each code can only be used once.'
      }
    });
    
  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({ success: false, message: 'MFA verification failed' });
  }
});

// Validate MFA token during login
router.post('/validate', async (req, res) => {
  try {
    const { userId, token, isBackupCode } = req.body;
    
    if (!userId || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and token are required' 
      });
    }
    
    // Get user's MFA details
    const user = await db.getOne(
      'SELECT mfa_secret, mfa_backup_codes, email, role FROM users WHERE id = $1 AND mfa_enabled = true',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found or MFA not enabled' 
      });
    }
    
    let verified = false;
    
    if (isBackupCode) {
      // Check backup codes
      const backupCodes = user.mfa_backup_codes || [];
      const codeIndex = backupCodes.indexOf(token.toUpperCase());
      
      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await db.update(
          'UPDATE users SET mfa_backup_codes = $1::text[] WHERE id = $2',
          [backupCodes, userId]
        );
        verified = true;
        logger.info(`Backup code used for user: ${userId}. Remaining codes: ${backupCodes.length}`);
      }
    } else {
      // Verify TOTP token
      verified = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });
    }
    
    if (!verified) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid MFA code' 
      });
    }
    
    res.json({
      success: true,
      message: 'MFA verification successful',
      data: {
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    logger.error('MFA validation error:', error);
    res.status(500).json({ success: false, message: 'MFA validation failed' });
  }
});

// Disable MFA
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'MFA token and password are required' 
      });
    }
    
    // Get user details
    const user = await db.getOne(
      'SELECT mfa_secret, mfa_enabled, password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (!user.mfa_enabled) {
      return res.status(400).json({ 
        success: false, 
        message: 'MFA is not enabled for this account' 
      });
    }
    
    // Verify password
    const bcrypt = require('bcryptjs');
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid password' 
      });
    }
    
    // Verify MFA token
    const verified = speakeasy.totp.verify({
      secret: user.mfa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid MFA code' 
      });
    }
    
    // Disable MFA
    await db.update(
      'UPDATE users SET mfa_enabled = false, mfa_secret = NULL, mfa_backup_codes = NULL WHERE id = $1',
      [userId]
    );
    
    logger.info(`MFA disabled for user: ${userId}`);
    
    res.json({
      success: true,
      message: 'MFA has been disabled successfully'
    });
    
  } catch (error) {
    logger.error('MFA disable error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable MFA' });
  }
});

// Get MFA status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await db.getOne(
      'SELECT mfa_enabled, mfa_backup_codes FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const backupCodes = user.mfa_backup_codes || [];
    
    res.json({
      success: true,
      data: {
        mfaEnabled: user.mfa_enabled || false,
        backupCodesRemaining: Array.isArray(backupCodes) ? backupCodes.length : 0
      }
    });
    
  } catch (error) {
    logger.error('MFA status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get MFA status' });
  }
});

module.exports = router;
