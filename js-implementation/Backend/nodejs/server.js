require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const authRouter = require('./routes/auth');
const notesRouter = require('./routes/notes');
const categoriesRouter = require('./routes/categories');
const tagsRouter = require('./routes/tags');

const serverApp = express();
const serverPort = process.env.PORT || 5000;

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
serverApp.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

serverApp.use('/api/auth', authRouter);
serverApp.use('/api/notes', notesRouter);
serverApp.use('/api/categories', categoriesRouter);
serverApp.use('/api/tags', tagsRouter);

if (require.main === module) {
    serverApp.listen(serverPort, () => console.log(`Server running on port ${serverPort}`));
}
module.exports = serverApp;
