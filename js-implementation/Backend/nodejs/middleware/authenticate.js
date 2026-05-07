function authenticate(req, res, next) {
    if (req.session && req.session.currentUserId) {
        return next();
    }
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
}
module.exports = authenticate;
