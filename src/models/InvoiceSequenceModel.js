const db = require('../config/database');

class InvoiceSequenceModel {
    /**
     * Atomically generate the next sequential Invoice Number (e.g. INV/202607/001)
     */
    static getNextInvoiceNumber(prefix = 'INV') {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const getStmt = db.prepare('SELECT last_number FROM invoice_sequence WHERE prefix = ? AND year = ? AND month = ?');
        const row = getStmt.get(prefix, year, month);

        let nextNum = 1;
        if (row) {
            nextNum = row.last_number + 1;
            const updateStmt = db.prepare('UPDATE invoice_sequence SET last_number = ? WHERE prefix = ? AND year = ? AND month = ?');
            updateStmt.run(nextNum, prefix, year, month);
        } else {
            const insertStmt = db.prepare('INSERT INTO invoice_sequence (prefix, year, month, last_number) VALUES (?, ?, ?, ?)');
            insertStmt.run(prefix, year, month, nextNum);
        }

        const monthPadded = String(month).padStart(2, '0');
        const numPadded = String(nextNum).padStart(3, '0');
        return `${prefix}/${year}${monthPadded}/${numPadded}`;
    }
}

module.exports = InvoiceSequenceModel;
