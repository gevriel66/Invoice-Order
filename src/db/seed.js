const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

function seedDatabase() {
    console.log('[SEED] Initializing database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(sql);

    // Auto-migrate columns for existing databases created before Milestone 3
    try {
        db.exec("ALTER TABLE orders ADD COLUMN invoice_pdf_path TEXT;");
    } catch (e) {}
    try {
        db.exec("ALTER TABLE orders ADD COLUMN surat_jalan_pdf_path TEXT;");
    } catch (e) {}

    console.log('[SEED] Seeding default Admin user (if not exists)...');
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const insertUser = db.prepare(`
        INSERT INTO users (username, password_hash, name, role)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(username) DO NOTHING
    `);
    insertUser.run('admin', adminPasswordHash, 'Administrator Toko', 'ADMIN');

    console.log('[SEED] Seeding default Master Satuan (Units)...');
    const insertUnit = db.prepare(`
        INSERT INTO units (name, code, description)
        VALUES (?, ?, ?)
        ON CONFLICT(code) DO NOTHING
    `);

    const defaultUnits = [
        ['Pieces', 'PCS', 'Satuan per potong / buah'],
        ['Paket', 'PAK', 'Satuan per pak'],
        ['Slop', 'SLOP', 'Satuan per slop (isi 10-20 bungkus)'],
        ['Box / Dus', 'BOX', 'Satuan per kotak / dus'],
        ['Bungkus', 'BKS', 'Satuan per bungkus'],
        ['Karton', 'KTN', 'Satuan per karton besar'],
        ['Kilogram', 'KG', 'Satuan berat kilogram'],
        ['Gram', 'GR', 'Satuan berat gram'],
        ['Liter', 'LTR', 'Satuan volume liter']
    ];

    db.transaction(() => {
        for (const u of defaultUnits) {
            insertUnit.run(u[0], u[1], u[2]);
        }
    })();

    console.log('[SEED] Seeding sample Products...');
    const pcsUnit = db.prepare("SELECT id, code FROM units WHERE code = 'PCS'").get();
    const pakUnit = db.prepare("SELECT id, code FROM units WHERE code = 'PAK'").get();
    const slopUnit = db.prepare("SELECT id, code FROM units WHERE code = 'SLOP'").get();

    const insertProduct = db.prepare(`
        INSERT INTO products (code, name, price, unit_id, unit_name, brand, description)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO NOTHING
    `);

    const sampleProducts = [
        ['PRD-001', 'Cooking Cream Milack Gold @1liter', 89500, pcsUnit ? pcsUnit.id : null, 'PCS', 'Milack', 'Cooking cream impor 1 liter'],
        ['PRD-002', 'Keju Parmesan Indo Cheese', 85500, pakUnit ? pakUnit.id : null, 'PAK', 'Indo Cheese', 'Keju parmesan bubuk 250gr'],
        ['PRD-003', 'Djarum Super 12', 246000, slopUnit ? slopUnit.id : null, 'SLOP', 'Djarum', 'Rokok Djarum Super isi 12 slop'],
        ['PRD-004', 'Esse Change Blue 20', 407000, slopUnit ? slopUnit.id : null, 'SLOP', 'Esse', 'Rokok Esse Change Blue slop'],
        ['PRD-005', 'Gudang Garam Filter 12', 495000, slopUnit ? slopUnit.id : null, 'SLOP', 'Gudang Garam', 'Rokok GG Filter 12 slop']
    ];

    db.transaction(() => {
        for (const p of sampleProducts) {
            insertProduct.run(...p);
        }
    })();

    console.log('[SEED] Seeding sample Customers...');
    const insertCustomer = db.prepare(`
        INSERT INTO customers (name, company, address, phone, email)
        VALUES (?, ?, ?, ?, ?)
    `);

    const sampleCustomers = [
        ['Gladya', 'Toko Gladya Surabaya', 'Jl. Pemuda No. 45, Surabaya', '081234567890', 'gladya@example.com'],
        ['Budi Santoso', 'CV Kuliner Jaya', 'Jl. Rungkut Industri III No. 12, Surabaya', '081987654321', 'budi@kulinerjaya.com']
    ];

    const customerCount = db.prepare('SELECT COUNT(*) as cnt FROM customers').get().cnt;
    if (customerCount === 0) {
        db.transaction(() => {
            for (const c of sampleCustomers) {
                insertCustomer.run(...c);
            }
        })();
    }

    console.log('[SEED SUCCESS] Database seeding completed successfully.');
}

if (require.main === module) {
    seedDatabase();
}

module.exports = seedDatabase;
