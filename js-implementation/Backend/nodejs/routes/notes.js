const express = require('express');
const { marked } = require('marked');
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');
const dbPool = require('../db');
const authenticate = require('../middleware/authenticate');
const notesRouter = express.Router();
const domWindow = new JSDOM('').window;
const DOMPurify = createDOMPurify(domWindow);

function renderMarkdown(rawMarkdown) {
    const rawHtml = marked.parse(rawMarkdown || '');
    return DOMPurify.sanitize(rawHtml);
}

notesRouter.use(authenticate);

// GET all notes (active only — not trashed)
notesRouter.get('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    try {
        const [noteRows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                    n.isTrash, n.categoryId, c.categoryName,
                    n.createdAt, n.updatedAt
             FROM notes n
             LEFT JOIN categories c ON n.categoryId = c.categoryId
             WHERE n.userId = ? AND n.isTrash = 0
             ORDER BY n.isPinned DESC, n.updatedAt DESC`,
            [currentUserId]
        );
        console.log(`Fetched ${noteRows.length} notes for user ${currentUserId}`);
        const result = noteRows.map(row => ({
            ...row, noteBodyHtml: renderMarkdown(row.noteBody)
        }));
        return res.status(200).json(result);
    } catch (err) {
        console.error('Error fetching notes:', err);
        return res.status(500).json({ error: 'Failed to retrieve notes.' });
    }
});


// GET trashed notes
notesRouter.get('/trash', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    try {
        const [rows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                    n.isTrash, n.categoryId, c.categoryName,
                    n.createdAt, n.updatedAt
             FROM notes n
             LEFT JOIN categories c ON n.categoryId = c.categoryId
             WHERE n.userId = ? AND n.isTrash = 1
             ORDER BY n.updatedAt DESC`,
            [currentUserId]
        );
        return res.status(200).json(rows);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve trash.' });
    }
});

// GET search
notesRouter.get('/search', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const searchQuery = req.query.q;
    if (!searchQuery || searchQuery.trim() === '') {
        return res.status(400).json({ error: 'Search query cannot be empty.' });
    }
    try {
        const [searchRows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                    n.isTrash, n.categoryId, c.categoryName,
                    n.createdAt, n.updatedAt,
                    MATCH(n.noteTitle, n.noteBody) AGAINST(? IN BOOLEAN MODE) AS relevanceScore
             FROM notes n
             LEFT JOIN categories c ON n.categoryId = c.categoryId
             WHERE n.userId = ? AND n.isTrash = 0
             AND MATCH(n.noteTitle, n.noteBody) AGAINST(? IN BOOLEAN MODE)
             ORDER BY relevanceScore DESC`,
            [searchQuery, currentUserId, searchQuery]
        );
        const result = searchRows.map(row => ({
            ...row, noteBodyHtml: renderMarkdown(row.noteBody)
        }));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Search failed.' });
    }
});

// GET single note
notesRouter.get('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    try {
        const [rows] = await dbPool.query(
            `SELECT n.noteId, n.noteTitle, n.noteBody, n.isPinned,
                    n.isTrash, n.categoryId, c.categoryName,
                    n.createdAt, n.updatedAt
             FROM notes n
             LEFT JOIN categories c ON n.categoryId = c.categoryId
             WHERE n.noteId = ? AND n.userId = ?`,
            [noteId, currentUserId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Note not found.' });
        return res.status(200).json({
            ...rows[0], noteBodyHtml: renderMarkdown(rows[0].noteBody)
        });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve note.' });
    }
});

// POST create note
notesRouter.post('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteTitle, noteBody, categoryId, isPinned } = req.body;
    if (!noteTitle) {
        return res.status(400).json({ error: 'Title is required.' });
    }
    try {
        const [result] = await dbPool.query(
            `INSERT INTO notes (userId, noteTitle, noteBody, categoryId, isPinned)
             VALUES (?, ?, ?, ?, ?)`,
            [currentUserId, noteTitle, noteBody || '', categoryId || null, isPinned ? 1 : 0]
        );
        return res.status(201).json({ message: 'Note created.', noteId: result.insertId });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to create note.' });
    }
});

// PUT update note
notesRouter.put('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    try {
        const [check] = await dbPool.query(
            'SELECT noteId FROM notes WHERE noteId = ? AND userId = ?',
            [noteId, currentUserId]
        );
        if (check.length === 0) return res.status(404).json({ error: 'Note not found.' });

        // Build dynamic update — only update fields that were sent
        const fields = [];
        const values = [];
        if (noteTitle !== undefined) { fields.push('noteTitle = ?'); values.push(noteTitle); }
        if (noteBody !== undefined) { fields.push('noteBody = ?'); values.push(noteBody); }
        if (categoryId !== undefined) { fields.push('categoryId = ?'); values.push(categoryId || null); }
        if (isPinned !== undefined) { fields.push('isPinned = ?'); values.push(isPinned ? 1 : 0); }
        if (isTrash !== undefined) { fields.push('isTrash = ?'); values.push(isTrash ? 1 : 0); }

        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update.' });

        values.push(noteId, currentUserId);
        await dbPool.query(
            `UPDATE notes SET ${fields.join(', ')} WHERE noteId = ? AND userId = ?`,
            values
        );
        return res.status(200).json({ message: 'Note updated.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update note.' });
    }
});

// DELETE empty trash — must be BEFORE /:noteId to avoid param conflict
notesRouter.delete('/trash/empty', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    try {
        await dbPool.query(
            'DELETE FROM notes WHERE userId = ? AND isTrash = 1',
            [currentUserId]
        );
        return res.status(200).json({ message: 'Trash emptied.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to empty trash.' });
    }
});

// DELETE note permanently
notesRouter.delete('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    try {
        const [result] = await dbPool.query(
            'DELETE FROM notes WHERE noteId = ? AND userId = ?',
            [noteId, currentUserId]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Note not found.' });
        return res.status(200).json({ message: 'Note deleted.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to delete note.' });
    }
});

module.exports = notesRouter;
