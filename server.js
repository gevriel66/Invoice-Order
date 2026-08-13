const dotenv = require('dotenv');
dotenv.config();

const app = require('./src/app');
const seedDatabase = require('./src/db/seed');
const WhatsAppService = require('./src/services/whatsappService');

const PORT = process.env.PORT || 3000;

// Initialize database schema & seed admin/master units if empty
seedDatabase();

app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  Sistem Invoice & Surat Jalan`);
    console.log(`  Server running on http://localhost:${PORT}`);
    console.log(`  Default Admin Credentials: admin / admin123`);
    console.log(`==================================================`);

    // Initialize WhatsApp Bot Service if enabled in .env
    WhatsAppService.init();
});
