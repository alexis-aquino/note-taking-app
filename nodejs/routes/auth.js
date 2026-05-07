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
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        const foundUser = rows[0];
        const passwordMatch = await bcrypt.compare(userPassword, foundUser.passwordHash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }
        req.session.currentUserId = foundUser.userId;
        return res.status(200).json({ message: 'Login successful.' });
    } catch (err) {
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