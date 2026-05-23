const express = require('express');
const dbPool = require('../db');
const authenticate = require('../middleware/authenticate');
const categoriesRouter = express.Router();

categoriesRouter.use(authenticate);

// GET all categories for the user
categoriesRouter.get('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    try {
        const [rows] = await dbPool.query(
            `SELECT c.categoryId, c.categoryName,
                    COUNT(n.noteId) AS noteCount
             FROM categories c
             LEFT JOIN notes n ON n.categoryId = c.categoryId
             WHERE c.userId = ?
             GROUP BY c.categoryId
             ORDER BY c.categoryName ASC`,
            [currentUserId]
        );
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve categories.' });
    }
});

// GET notes for a specific category
categoriesRouter.get('/:categoryId/notes', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { categoryId } = req.params;
    try {
        const [rows] = await dbPool.query(
            `SELECT noteId, noteTitle, noteBody, isPinned, updatedAt
             FROM notes
             WHERE userId = ? AND categoryId = ?
             ORDER BY isPinned DESC, updatedAt DESC`,
            [currentUserId, categoryId]
        );
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve notes for category.' });
    }
});

// POST create category
categoriesRouter.post('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { categoryName } = req.body;
    if (!categoryName || !categoryName.trim()) {
        return res.status(400).json({ error: 'Category name is required.' });
    }
    try {
        const [result] = await dbPool.query(
            'INSERT INTO categories (userId, categoryName) VALUES (?, ?)',
            [currentUserId, categoryName.trim()]
        );
        return res.status(201).json({ message: 'Category created.', categoryId: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Category already exists.' });
        }
        return res.status(500).json({ error: 'Failed to create category.' });
    }
});

// PUT rename category
categoriesRouter.put('/:categoryId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { categoryId } = req.params;
    const { categoryName } = req.body;
    if (!categoryName || !categoryName.trim()) {
        return res.status(400).json({ error: 'Category name is required.' });
    }
    try {
        const [result] = await dbPool.query(
            'UPDATE categories SET categoryName = ? WHERE categoryId = ? AND userId = ?',
            [categoryName.trim(), categoryId, currentUserId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found.' });
        return res.status(200).json({ message: 'Category renamed.' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'A category with that name already exists.' });
        }
        return res.status(500).json({ error: 'Failed to rename category.' });
    }
});

// DELETE category
categoriesRouter.delete('/:categoryId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { categoryId } = req.params;
    try {
        const [result] = await dbPool.query(
            'DELETE FROM categories WHERE categoryId = ? AND userId = ?',
            [categoryId, currentUserId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Category not found.' });
        return res.status(200).json({ message: 'Category deleted.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to delete category.' });
    }
});

module.exports = categoriesRouter;
