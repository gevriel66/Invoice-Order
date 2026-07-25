const dotenv = require('dotenv');
dotenv.config();

const app = require('./src/app');
const seedDatabase = require('./src/db/seed');

const PORT = process.env.PORT || 3000;

// Initialize database schema & seed admin/master units if empty
seedDatabase();

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Sistem Invoice & Surat Jalan (Milestone 1)`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  Default Admin Credentials: admin / admin123`);
    console.log(`==================================================`);
});
