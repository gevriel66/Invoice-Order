const db = require('../config/database');

class ProductModel {
    static getAll() {
        const sql = `
            SELECT p.*, u.code as unit_code, u.name as unit_full_name
            FROM products p
            LEFT JOIN units u ON p.unit_id = u.id
            ORDER BY p.name ASC
        `;
        return db.prepare(sql).all();
    }

    static getById(id) {
        const sql = `
            SELECT p.*, u.code as unit_code, u.name as unit_full_name
            FROM products p
            LEFT JOIN units u ON p.unit_id = u.id
            WHERE p.id = ?
        `;
        return db.prepare(sql).get(id);
    }

    static search(query) {
        const q = `%${query}%`;
        const sql = `
            SELECT p.*, u.code as unit_code, u.name as unit_full_name
            FROM products p
            LEFT JOIN units u ON p.unit_id = u.id
            WHERE p.name LIKE ? OR p.code LIKE ? OR p.brand LIKE ?
            ORDER BY p.name ASC
        `;
        return db.prepare(sql).all(q, q, q);
    }

    static create(data) {
        let unitName = data.unit_name || 'PCS';
        if (data.unit_id) {
            const u = db.prepare('SELECT code FROM units WHERE id = ?').get(data.unit_id);
            if (u) unitName = u.code;
        }

        const stmt = db.prepare(`
            INSERT INTO products (code, name, price, unit_id, unit_name, brand, description, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        const res = stmt.run(
            data.code ? data.code.trim() : null,
            data.name.trim(),
            Number(data.price) || 0,
            data.unit_id || null,
            unitName,
            data.brand ? data.brand.trim() : '',
            data.description ? data.description.trim() : ''
        );
        return res.lastInsertRowid;
    }

    static update(id, data) {
        let unitName = data.unit_name || 'PCS';
        if (data.unit_id) {
            const u = db.prepare('SELECT code FROM units WHERE id = ?').get(data.unit_id);
            if (u) unitName = u.code;
        }

        const stmt = db.prepare(`
            UPDATE products 
            SET code = ?, name = ?, price = ?, unit_id = ?, unit_name = ?, brand = ?, description = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `);
        stmt.run(
            data.code ? data.code.trim() : null,
            data.name.trim(),
            Number(data.price) || 0,
            data.unit_id || null,
            unitName,
            data.brand ? data.brand.trim() : '',
            data.description ? data.description.trim() : '',
            id
        );
        return true;
    }

    static delete(id) {
        const stmt = db.prepare('DELETE FROM products WHERE id = ?');
        stmt.run(id);
        return true;
    }
}

module.exports = ProductModel;
