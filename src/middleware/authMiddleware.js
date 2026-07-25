function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        res.locals.currentUser = req.session.user;
        return next();
    }
    return res.redirect('/login');
}

function redirectIfAuth(req, res, next) {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    return next();
}

module.exports = {
    requireAuth,
    redirectIfAuth
};
