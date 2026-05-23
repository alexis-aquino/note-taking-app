const express = require('express');
const bcrypt = require('bcrypt');
const dbPool = require('../db');
const authRouter = express.Router();
const saltRounds = 12;
authRouter.post('/register', async (req, res) => {
    const { userName, userEmail, userPassword } = req.body;
    if (!userName || !userEmail || !userPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    try {
        const [existingRows] = await dbPool.query(
            'SELECT userId FROM users WHERE userEmail = ?', [userEmail]
        );
        if (existingRows.length > 0) {
            return res.status(409).json({ error: 'Email already registered.' });
        }
        const hashedPassword = await bcrypt.hash(userPassword, saltRounds);
        const [result] = await dbPool.query(
            'INSERT INTO users (userEmail, displayName, passwordHash) VALUES (?, ?, ?)',
            [userEmail, userName, hashedPassword]
        );
        return res.status(201).json({ message: 'Registered.', userId: result.insertId });
    } catch (err) {
        return res.status(500).json({ error: 'Registration failed.' });
    }
});
authRouter.post('/login', async (req, res) => {
    const { userEmail, userPassword } = req.body;
    if (!userEmail || !userPassword) {
        return res.status(400).json({ error: 'Email and password required.' });
    }
    try {
        const [rows] = await dbPool.query(
            'SELECT userId, passwordHash FROM users WHERE userEmail = ?', [userEmail]
        );
        console.log(`Login attempt for ${userEmail} - User found: ${rows.length > 0}`);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const foundUser = rows[0];
        const passwordMatch = await bcrypt.compare(userPassword, foundUser.passwordHash);
        console.log(`Password match for ${userEmail}: ${passwordMatch}`);
        
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        req.session.currentUserId = foundUser.userId;
        return res.status(200).json({ message: 'Login successful.' });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed.' });
    }
});
authRouter.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ error: 'Logout failed.' });
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logged out.' });
    });
});
authRouter.get('/me', async (req, res) => {
    if (!req.session || !req.session.currentUserId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    try {
        const [rows] = await dbPool.query(
            'SELECT userId, userEmail, displayName, createdAt FROM users WHERE userId = ?',
            [req.session.currentUserId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        return res.status(200).json(rows[0]);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

authRouter.put('/me', async (req, res) => {
    if (!req.session || !req.session.currentUserId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const { displayName } = req.body;
    if (!displayName || !displayName.trim()) {
        return res.status(400).json({ error: 'Display name is required.' });
    }
    try {
        await dbPool.query(
            'UPDATE users SET displayName = ? WHERE userId = ?',
            [displayName.trim(), req.session.currentUserId]
        );
        return res.status(200).json({ message: 'Profile updated.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update profile.' });
    }
});

authRouter.put('/change-password', async (req, res) => {
    if (!req.session || !req.session.currentUserId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'All fields are required.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }
    try {
        const [rows] = await dbPool.query(
            'SELECT passwordHash FROM users WHERE userId = ?',
            [req.session.currentUserId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
        const match = await bcrypt.compare(currentPassword, rows[0].passwordHash);
        if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });
        const newHash = await bcrypt.hash(newPassword, saltRounds);
        await dbPool.query(
            'UPDATE users SET passwordHash = ? WHERE userId = ?',
            [newHash, req.session.currentUserId]
        );
        return res.status(200).json({ message: 'Password changed.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to change password.' });
    }
});

authRouter.delete('/account', async (req, res) => {
    if (!req.session || !req.session.currentUserId) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    const currentUserId = req.session.currentUserId;
    try {
        await dbPool.query('DELETE FROM users WHERE userId = ?', [currentUserId]);
        req.session.destroy(() => {
            res.clearCookie('connect.sid');
            return res.status(200).json({ message: 'Account deleted.' });
        });
    } catch (err) {
        return res.status(500).json({ error: 'Account deletion failed.' });
    }
});
module.exports = authRouter;