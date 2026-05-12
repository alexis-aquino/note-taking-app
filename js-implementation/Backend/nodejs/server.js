require('dotenv').config();
const express = require('express');
const session = require('express-session');
const authRouter = require('./routes/auth');
const notesRouter = require('./routes/notes');
const cors = require('cors');
const mysql = require('mysql2');

const serverApp = express();
const serverPort = process.env.PORT || 5000;

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: null,
    database: "noteAppDb"
});

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
serverApp.get('/api/users', (req, res) => {
  db.query('SELECT * FROM users', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results); // sends data back as JSON
  });
});
if (require.main === module) {
    serverApp.listen(serverPort, () => console.log(`Server running on port ${serverPort}`));
}
module.exports = serverApp;