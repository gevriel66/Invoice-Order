const db = require('../config/database');

class UnitModel {
    static getAll() {
        return db.prepare('SELECT * FROM units ORDER BY code ASC').all();
    }

    static getById(id) {
        return db.prepare('SELECT * FROM units WHERE id = ?').get(id);
    }

    static getByCode(code) {
        return db.prepare('SELECT * FROM units WHERE code = ?').get(code);
    }

    static create(data) {
        const stmt = db.prepare('INSERT INTO units (name, code, description) VALUES (?, ?, ?)');
        const res = stmt.run(data.name.trim(), data.code.trim().toUpperCase(), data.description || '');
        return res.lastInsertRowid;
    }

    static update(id, data) {
        const stmt = db.prepare('UPDATE units SET name = ?, code = ?, description = ? WHERE id = ?');
        stmt.run(data.name.trim(), data.code.trim().toUpperCase(), data.description || '', id);
        return true;
    }

    static delete(id) {
        const stmt = db.prepare('DELETE FROM units WHERE id = ?');
        stmt.run(id);
        return true;
    }
}

module.exports = UnitModel;
