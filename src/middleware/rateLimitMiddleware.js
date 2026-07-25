const loginAttempts = new Map();

function loginRateLimiter(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10;

    const record = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
        record.count = 0;
        record.resetTime = now + windowMs;
    }

    if (record.count >= maxAttempts) {
        const remainingMinutes = Math.ceil((record.resetTime - now) / 60000);
        return res.status(429).render('auth/login', {
            error: `Terlalu banyak percobaan login gagal. Silakan tunggu ${remainingMinutes} menit lagi.`
        });
    }

    record.count += 1;
    loginAttempts.set(ip, record);

    next();
}

module.exports = loginRateLimiter;
