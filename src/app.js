const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const logger = require('./utils/logger');
const SQLiteSessionStore = require('./utils/sessionStore');
const csrfProtection = require('./middleware/csrfMiddleware');
const webRoutes = require('./routes/webRoutes');

const app = express();

// Security Headers Middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Ensure required production directories exist on startup
const storageDir = process.env.STORAGE_DIR ? path.resolve(process.cwd(), process.env.STORAGE_DIR) : path.resolve(process.cwd(), 'storage');
const tempDir = process.env.TEMP_DIR ? path.resolve(process.cwd(), process.env.TEMP_DIR) : path.resolve(process.cwd(), 'temp');
const logsDir = process.env.LOGS_DIR ? path.resolve(process.cwd(), process.env.LOGS_DIR) : path.resolve(process.cwd(), 'logs');

[
    storageDir,
    path.join(storageDir, 'documents', 'invoice'),
    path.join(storageDir, 'documents', 'surat-jalan'),
    path.join(storageDir, 'backups'),
    tempDir,
    logsDir
].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Persistent SQLite Session Setup (C-02 Fix)
app.use(session({
    store: new SQLiteSessionStore(),
    secret: process.env.SESSION_SECRET || 'latihan-invoice-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.HTTPS === 'true'
    }
}));

// CSRF Protection Middleware
app.use(csrfProtection);

// Routes
app.use('/', webRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Sistem Invoice & Surat Jalan Active' });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).render('auth/login', { error: 'Halaman tidak ditemukan.' });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    logger.error(`Unhandled Error on ${req.method} ${req.url}`, err);
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(500).render('auth/login', {
        error: process.env.NODE_ENV === 'production'
            ? 'Terjadi kesalahan internal pada server. Silakan hubungi administrator.'
            : `System Error: ${err.message}`
    });
});

module.exports = app;
