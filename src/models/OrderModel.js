const db = require('../config/database');
const InvoiceSequenceModel = require('./InvoiceSequenceModel');

class OrderModel {
    static getAll(filters = {}) {
        let sql = `
            SELECT o.*, c.name as customer_current_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE 1=1
        `;
        const params = [];

        if (filters.status) {
            sql += ` AND o.status = ?`;
            params.push(filters.status);
        }

        if (filters.search) {
            const q = `%${filters.search}%`;
            sql += ` AND (o.invoice_number LIKE ? OR o.customer_name_snapshot LIKE ? OR o.po_number LIKE ?)`;
            params.push(q, q, q);
        }

        sql += ` ORDER BY o.id DESC`;

        const orders = db.prepare(sql).all(...params);
        const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');

        for (const order of orders) {
            order.items = itemsStmt.all(order.id);
        }
        return orders;
    }

    static getById(id) {
        const orderStmt = db.prepare('SELECT * FROM orders WHERE id = ?');
        const order = orderStmt.get(id);
        if (!order) return null;

        const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');
        order.items = itemsStmt.all(id);

        return order;
    }

    static getCounts() {
        const total = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
        const draft = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'DRAFT'").get().cnt;
        const final = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'FINAL'").get().cnt;
        const cancelled = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'CANCELLED'").get().cnt;
        return { total, draft, final, cancelled };
    }

    /**
     * Create order with items inside SQLite transaction
     * Invoice number generated ONLY if status is 'FINAL'
     */
    static create(data) {
        return db.transaction(() => {
            const status = (data.status === 'FINAL') ? 'FINAL' : 'DRAFT';
            let invoiceNumber = null;

            if (status === 'FINAL') {
                invoiceNumber = InvoiceSequenceModel.getNextInvoiceNumber('INV');
            }

            const items = data.items || [];
            let totalCalculated = 0;
            for (const item of items) {
                const pPrice = Number(item.price_snapshot) || 0;
                const pQty = Number(item.quantity) || 0;
                totalCalculated += (pPrice * pQty);
            }

            const todayStr = new Date().toISOString().split('T')[0];

            const insertOrder = db.prepare(`
                INSERT INTO orders (
                    invoice_number, order_date, due_date, po_number, ref_number,
                    customer_id, customer_name_snapshot, customer_company_snapshot,
                    customer_address_snapshot, customer_phone_snapshot,
                    sender_info, recipient_info, total_amount, notes, status, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
                )
            `);

            const res = insertOrder.run(
                invoiceNumber,
                data.order_date || todayStr,
                data.due_date || '',
                data.po_number || '',
                data.ref_number || '',
                data.customer_id || null,
                data.customer_name_snapshot || 'Pelanggan Umum',
                data.customer_company_snapshot || '',
                data.customer_address_snapshot || '',
                data.customer_phone_snapshot || '',
                data.sender_info || 'Grocery Kuliner Nusantara',
                data.recipient_info || '',
                totalCalculated,
                data.notes || 'Barang yang sudah dibeli tidak dapat ditukar atau di kembalikan',
                status
            );

            const orderId = res.lastInsertRowid;

            // If draft and invoice_number was null, update draft reference name as DRAFT-ID
            if (!invoiceNumber && status === 'DRAFT') {
                const draftInvNum = `DRAFT-${String(orderId).padStart(4, '0')}`;
                db.prepare('UPDATE orders SET invoice_number = ? WHERE id = ?').run(draftInvNum, orderId);
            }

            const insertItem = db.prepare(`
                INSERT INTO order_items (
                    order_id, product_id, product_code_snapshot, product_name_snapshot,
                    price_snapshot, unit_snapshot, brand, quantity
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?
                )
            `);

            for (const item of items) {
                if (item.product_name_snapshot && item.product_name_snapshot.trim()) {
                    insertItem.run(
                        orderId,
                        item.product_id || null,
                        item.product_code_snapshot || '',
                        item.product_name_snapshot.trim(),
                        Number(item.price_snapshot) || 0,
                        item.unit_snapshot || 'PCS',
                        item.brand || '',
                        Number(item.quantity) || 1
                    );
                }
            }

            return orderId;
        })();
    }

    /**
     * Update order (Allowed ONLY when current status is 'DRAFT')
     */
    static update(id, data) {
        return db.transaction(() => {
            const currentOrder = db.prepare('SELECT status, invoice_number FROM orders WHERE id = ?').get(id);
            if (!currentOrder) throw new Error('Transaksi tidak ditemukan.');
            if (currentOrder.status !== 'DRAFT') {
                throw new Error('Hanya transaksi berstatus DRAFT yang dapat diedit.');
            }

            const items = data.items || [];
            let totalCalculated = 0;
            for (const item of items) {
                const pPrice = Number(item.price_snapshot) || 0;
                const pQty = Number(item.quantity) || 0;
                totalCalculated += (pPrice * pQty);
            }

            const updateOrder = db.prepare(`
                UPDATE orders SET
                    order_date = ?, due_date = ?, po_number = ?, ref_number = ?,
                    customer_id = ?, customer_name_snapshot = ?, customer_company_snapshot = ?,
                    customer_address_snapshot = ?, customer_phone_snapshot = ?,
                    sender_info = ?, recipient_info = ?, total_amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `);

            updateOrder.run(
                data.order_date,
                data.due_date || '',
                data.po_number || '',
                data.ref_number || '',
                data.customer_id || null,
                data.customer_name_snapshot || 'Pelanggan Umum',
                data.customer_company_snapshot || '',
                data.customer_address_snapshot || '',
                data.customer_phone_snapshot || '',
                data.sender_info || 'Grocery Kuliner Nusantara',
                data.recipient_info || '',
                totalCalculated,
                data.notes || 'Barang yang sudah dibeli tidak dapat ditukar atau di kembalikan',
                id
            );

            // Clear old items & re-insert updated items
            db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);

            const insertItem = db.prepare(`
                INSERT INTO order_items (
                    order_id, product_id, product_code_snapshot, product_name_snapshot,
                    price_snapshot, unit_snapshot, brand, quantity
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?, ?
                )
            `);

            for (const item of items) {
                if (item.product_name_snapshot && item.product_name_snapshot.trim()) {
                    insertItem.run(
                        id,
                        item.product_id || null,
                        item.product_code_snapshot || '',
                        item.product_name_snapshot.trim(),
                        Number(item.price_snapshot) || 0,
                        item.unit_snapshot || 'PCS',
                        item.brand || '',
                        Number(item.quantity) || 1
                    );
                }
            }

            return true;
        })();
    }

    /**
     * Change Transaction Status
     * When status changes to 'FINAL', generate official sequential Invoice Number
     */
    static updateStatus(id, newStatus) {
        return db.transaction(() => {
            const currentOrder = db.prepare('SELECT status, invoice_number FROM orders WHERE id = ?').get(id);
            if (!currentOrder) throw new Error('Transaksi tidak ditemukan.');

            if (newStatus === 'FINAL' && currentOrder.status !== 'FINAL') {
                const officialInvoiceNumber = InvoiceSequenceModel.getNextInvoiceNumber('INV');
                db.prepare('UPDATE orders SET status = ?, invoice_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('FINAL', officialInvoiceNumber, id);
            } else {
                db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, id);
            }
            return true;
        })();
    }

    /**
     * Update generated PDF paths
     */
    static updatePdfPaths(id, { invoice_pdf_path, surat_jalan_pdf_path }) {
        if (invoice_pdf_path && surat_jalan_pdf_path) {
            db.prepare('UPDATE orders SET invoice_pdf_path = ?, surat_jalan_pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(invoice_pdf_path, surat_jalan_pdf_path, id);
        } else if (invoice_pdf_path) {
            db.prepare('UPDATE orders SET invoice_pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(invoice_pdf_path, id);
        } else if (surat_jalan_pdf_path) {
            db.prepare('UPDATE orders SET surat_jalan_pdf_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
                .run(surat_jalan_pdf_path, id);
        }
    }
}

module.exports = OrderModel;
