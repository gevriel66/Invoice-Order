const db = require('../config/database');

class CustomerModel {
    static getAll() {
        return db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    }

    static getById(id) {
        return db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    }

    static search(query) {
        const q = `%${query}%`;
        return db.prepare('SELECT * FROM customers WHERE name LIKE ? OR company LIKE ? OR phone LIKE ? ORDER BY name ASC').all(q, q, q);
    }

    static create(data) {
        const stmt = db.prepare(`
            INSERT INTO customers (name, company, address, phone, email, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        const res = stmt.run(
            data.name.trim(),
            data.company ? data.company.trim() : '',
            data.address ? data.address.trim() : '',
            data.phone ? data.phone.trim() : '',
            data.email ? data.email.trim() : ''
        );
        return res.lastInsertRowid;
    }

    static update(id, data) {
        const stmt = db.prepare(`
            UPDATE customers
            SET name = ?, company = ?, address = ?, phone = ?, email = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(
            data.name.trim(),
            data.company ? data.company.trim() : '',
            data.address ? data.address.trim() : '',
            data.phone ? data.phone.trim() : '',
            data.email ? data.email.trim() : '',
            id
        );
        return true;
    }

    static delete(id) {
        const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
        stmt.run(id);
        return true;
    }
}

module.exports = CustomerModel;
