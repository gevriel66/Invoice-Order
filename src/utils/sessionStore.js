const session = require('express-session');
const db = require('../config/database');

class SQLiteSessionStore extends session.Store {
    constructor() {
        super();
        this.db = db;
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                sid TEXT PRIMARY KEY,
                sess TEXT NOT NULL,
                expired DATETIME NOT NULL
            );
        `);
    }

    get(sid, callback) {
        try {
            const row = this.db.prepare("SELECT sess, expired FROM sessions WHERE sid = ?").get(sid);
            if (!row) return callback(null, null);
            if (new Date(row.expired) < new Date()) {
                this.destroy(sid, () => {});
                return callback(null, null);
            }
            callback(null, JSON.parse(row.sess));
        } catch (err) {
            callback(err);
        }
    }

    set(sid, sess, callback) {
        try {
            const maxAge = (sess.cookie && sess.cookie.maxAge) ? sess.cookie.maxAge : 86400000;
            const expired = new Date(Date.now() + maxAge).toISOString();
            const sessStr = JSON.stringify(sess);
            this.db.prepare(`
                INSERT INTO sessions (sid, sess, expired) VALUES (?, ?, ?)
                ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expired = excluded.expired
            `).run(sid, sessStr, expired);
            if (callback) callback(null);
        } catch (err) {
            if (callback) callback(err);
        }
    }

    destroy(sid, callback) {
        try {
            this.db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
            if (callback) callback(null);
        } catch (err) {
            if (callback) callback(err);
        }
    }
}

module.exports = SQLiteSessionStore;
