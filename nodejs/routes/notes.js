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
    const rawHtml = marked.parse(rawMarkdown);
    return DOMPurify.sanitize(rawHtml);
}
notesRouter.use(authenticate);
notesRouter.get('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    try {
        const [noteRows] = await dbPool.query(
            `SELECT noteId, noteTitle, noteBody, isPinned, categoryId, createdAt, updatedAt
FROM notes WHERE userId = ?
ORDER BY isPinned DESC, updatedAt DESC`,
            [currentUserId]
        );
        const result = noteRows.map(row => ({
            ...row, noteBodyHtml: renderMarkdown(row.noteBody)
        }));
        return res.status(200).json(result);
    } catch (err) {
        return res.status(500).json({ error: 'Failed to retrieve notes.' });
    }
});
notesRouter.get('/search', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const searchQuery = req.query.q;
    if (!searchQuery || searchQuery.trim() === '') {
        return res.status(400).json({ error: 'Search query cannot be empty.' });
    }
    try {
        const [searchRows] = await dbPool.query(
            `SELECT noteId, noteTitle, noteBody, isPinned, categoryId, createdAt, updatedAt,
MATCH(noteTitle, noteBody) AGAINST(? IN BOOLEAN MODE) AS relevanceScore
FROM notes
WHERE userId = ?
AND MATCH(noteTitle, noteBody) AGAINST(? IN BOOLEAN MODE)
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
notesRouter.get('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    try {
        const [rows] = await dbPool.query(
            `SELECT noteId, noteTitle, noteBody, isPinned, categoryId, createdAt, updatedAt
FROM notes WHERE noteId = ? AND userId = ?`,
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
notesRouter.post('/', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteTitle, noteBody, categoryId, isPinned } = req.body;
    if (!noteTitle || !noteBody) {
        return res.status(400).json({ error: 'Title and body are required.' });
    }
    try {
        const [result] = await dbPool.query(
            `INSERT INTO notes (userId, noteTitle, noteBody, categoryId, isPinned)
VALUES (?, ?, ?, ?, ?)`,
            [currentUserId, noteTitle, noteBody, categoryId || null, isPinned ? 1 : 0]
        );
        return res.status(201).json({ message: 'Note created.', noteId: result.insertId });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to create note.' });
    }
});
notesRouter.put('/:noteId', async (req, res) => {
    const currentUserId = req.session.currentUserId;
    const { noteId } = req.params;
    const { noteTitle, noteBody, categoryId, isPinned } = req.body;
    if (!noteTitle || !noteBody) {
        return res.status(400).json({ error: 'Title and body are required.' });
    }
    try {
        const [check] = await dbPool.query(
            'SELECT noteId FROM notes WHERE noteId = ? AND userId = ?',
            [noteId, currentUserId]
        );
        if (check.length === 0) return res.status(404).json({ error: 'Note not found.' });
        await dbPool.query(
            `UPDATE notes SET noteTitle=?, noteBody=?, categoryId=?, isPinned=?
WHERE noteId=? AND userId=?`,
            [noteTitle, noteBody, categoryId || null, isPinned ? 1 : 0, noteId, currentUserId]
        );
        return res.status(200).json({ message: 'Note updated.' });
    } catch (err) {
        return res.status(500).json({ error: 'Failed to update note.' });
    }
});
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