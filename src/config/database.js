const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbPath = process.env.DB_PATH 
    ? path.resolve(process.cwd(), process.env.DB_PATH)
    : path.resolve(process.cwd(), 'database.sqlite');

const nativeDb = new DatabaseSync(dbPath);

// Enable WAL mode & Foreign Keys for stability & high concurrency performance
nativeDb.exec('PRAGMA journal_mode = WAL;');
nativeDb.exec('PRAGMA foreign_keys = ON;');

/**
 * better-sqlite3 API compatibility wrapper over Node 24 node:sqlite
 */
class StatementWrapper {
    constructor(stmt) {
        this.stmt = stmt;
    }

    all(...params) {
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        return this.stmt.all(...flatParams);
    }

    get(...params) {
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        return this.stmt.get(...flatParams);
    }

    run(...params) {
        const flatParams = (params.length === 1 && Array.isArray(params[0])) ? params[0] : params;
        const info = this.stmt.run(...flatParams);
        return {
            changes: info.changes,
            lastInsertRowid: Number(info.lastInsertRowid)
        };
    }
}

class BetterSqlite3Adapter {
    constructor(db) {
        this.db = db;
    }

    exec(sql) {
        return this.db.exec(sql);
    }

    pragma(str) {
        return this.db.exec(`PRAGMA ${str};`);
    }

    prepare(sql) {
        const stmt = this.db.prepare(sql);
        return new StatementWrapper(stmt);
    }

    transaction(fn) {
        return (...args) => {
            this.db.exec('BEGIN');
            try {
                const result = fn(...args);
                this.db.exec('COMMIT');
                return result;
            } catch (err) {
                this.db.exec('ROLLBACK');
                throw err;
            }
        };
    }
}

const dbAdapter = new BetterSqlite3Adapter(nativeDb);

module.exports = dbAdapter;
