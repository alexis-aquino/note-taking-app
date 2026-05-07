require('dotenv').config();
const express = require('express');
const session = require('express-session');
const authRouter = require('./routes/auth');
const notesRouter = require('./routes/notes');
const serverApp = express();
const serverPort = process.env.PORT || 3000;
serverApp.use(express.json());
serverApp.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24,
    },
}));
serverApp.use('/api/auth', authRouter);
serverApp.use('/api/notes', notesRouter);
serverApp.use((req, res) => {
    res.status(404).json({ error: 'Route not found.' });
});
serverApp.use((err, req, res, next) => {
    res.status(500).json({ error: 'Internal server error.' });
});
if (require.main === module) {
    serverApp.listen(serverPort, () => {
        console.log('Server running on port ' + serverPort);
    });
}
module.exports = serverApp;