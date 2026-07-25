const crypto = require('crypto');

function csrfProtection(req, res, next) {
    if (!req.session) {
        return next();
    }

    if (!req.session.csrfToken) {
        req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    }

    res.locals.csrfToken = req.session.csrfToken;

    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const token = (req.body && req.body._csrf) || req.headers['x-csrf-token'];
        if (!token || token !== req.session.csrfToken) {
            // Render login if forbidden or invalid CSRF
            return res.status(403).render('auth/login', { 
                error: 'Sesi atau Token Keamanan CSRF telah kadaluarsa. Silakan muat ulang halaman.' 
            });
        }
    }

    next();
}

module.exports = csrfProtection;
