const request = require('supertest');
const serverApp = require('../server');
const dbPool = require('../db');
const userAgentA = request.agent(serverApp);
const userAgentB = request.agent(serverApp);
let createdNoteId;
beforeAll(async () => {
    await dbPool.query(
        'DELETE FROM users WHERE userEmail IN (?, ?)',
        ['usera@test.com', 'userb@test.com']
    );
    await userAgentA.post('/api/auth/register').send({
        userName: 'User A', userEmail: 'usera@test.com', userPassword: 'passwordA123',
    });
    await userAgentA.post('/api/auth/login').send({
        userEmail: 'usera@test.com', userPassword: 'passwordA123',
    });
    await userAgentB.post('/api/auth/register').send({
        userName: 'User B', userEmail: 'userb@test.com', userPassword: 'passwordB123',
    });
    await userAgentB.post('/api/auth/login').send({
        userEmail: 'userb@test.com', userPassword: 'passwordB123',
    });
});
afterAll(async () => {
    await dbPool.query(
        'DELETE FROM users WHERE userEmail IN (?, ?)',
        ['usera@test.com', 'userb@test.com']
    );
    await dbPool.end();
});
describe('Registration and login', () => {
    it('rejects registration with missing fields', async () => {
        const res = await request(serverApp).post('/api/auth/register').send({});
        expect(res.status).toBe(400);
    });
    it('rejects duplicate email registration', async () => {
        const res = await request(serverApp).post('/api/auth/register').send({
            userName: 'Dup', userEmail: 'usera@test.com', userPassword: 'pass',
        });
        expect(res.status).toBe(409);
    });
    it('rejects login with wrong password', async () => {
        const res = await request(serverApp).post('/api/auth/login').send({
            userEmail: 'usera@test.com', userPassword: 'wrongpass',
        });
        expect(res.status).toBe(401);
    });
});
describe('User isolation — note access', () => {
    it('User A creates a note', async () => {
        const res = await userAgentA.post('/api/notes').send({
            noteTitle: 'User A Secret Note',
            noteBody: 'This belongs only to User A.',
        });
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('noteId');
        createdNoteId = res.body.noteId;
    });
    it('User A reads their own note', async () => {
        const res = await userAgentA.get(`/api/notes/${createdNoteId}`);
        expect(res.status).toBe(200);
        expect(res.body.noteTitle).toBe('User A Secret Note');
    });
    it('User B cannot read User A note', async () => {
        const res = await userAgentB.get(`/api/notes/${createdNoteId}`);
        expect(res.status).toBe(404);
    });
    it('User B cannot update User A note', async () => {
        const res = await userAgentB.put(`/api/notes/${createdNoteId}`).send({
            noteTitle: 'Hijacked', noteBody: 'Malicious.',
        });
        expect(res.status).toBe(404);
    });
    it('User B cannot delete User A note', async () => {
        const res = await userAgentB.delete(`/api/notes/${createdNoteId}`);
        expect(res.status).toBe(404);
    });
    it('User B note list does not contain User A note', async () => {
        const res = await userAgentB.get('/api/notes');
        const ids = res.body.map(r => r.noteId);
        expect(ids).not.toContain(createdNoteId);
    });
    it('Unauthenticated request is blocked', async () => {
        const res = await request(serverApp).get('/api/notes');
        expect(res.status).toBe(401);
    });
});
describe('Notes CRUD — User A', () => {
    it('updates their own note', async () => {
        const res = await userAgentA.put(`/api/notes/${createdNoteId}`).send({
            noteTitle: 'Updated Title', noteBody: 'Updated body.', isPinned: true,
        });
        expect(res.status).toBe(200);
    });
    it('updated note reflects changes', async () => {
        const res = await userAgentA.get(`/api/notes/${createdNoteId}`);
        expect(res.body.noteTitle).toBe('Updated Title');
        expect(res.body.isPinned).toBe(1);
    });
    it('note list returns notes', async () => {
        const res = await userAgentA.get('/api/notes');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
    it('deletes their own note', async () => {
        const res = await userAgentA.delete(`/api/notes/${createdNoteId}`);
        expect(res.status).toBe(200);
    });
    it('deleted note returns 404', async () => {
        const res = await userAgentA.get(`/api/notes/${createdNoteId}`);
        expect(res.status).toBe(404);
    });
});
