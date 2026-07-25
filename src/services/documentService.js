const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const OrderModel = require('../models/OrderModel');
const logger = require('../utils/logger');

class DocumentService {
    static generateDocument(orderId, type = 'both') {
        return new Promise((resolve, reject) => {
            const order = OrderModel.getById(orderId);
            if (!order) {
                logger.warn(`PDF Generation failed: Order ID ${orderId} not found.`);
                return reject(new Error('Transaksi tidak ditemukan.'));
            }
            if (order.status !== 'FINAL') {
                logger.warn(`PDF Generation failed: Order ID ${orderId} is not FINAL.`);
                return reject(new Error('Dokumen PDF hanya dapat dibuat untuk transaksi berstatus FINAL.'));
            }

            const tempDir = process.env.TEMP_DIR 
                ? path.resolve(process.cwd(), process.env.TEMP_DIR)
                : path.join(__dirname, '../../temp');

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Save order data to temporary JSON file for PowerShell COM
            const jsonPath = path.join(tempDir, `order_${orderId}_input.json`);
            fs.writeFileSync(jsonPath, JSON.stringify(order, null, 2), 'utf-8');

            const psScript = path.join(__dirname, 'generate_pdf_com.ps1');

            logger.info(`Starting PDF Generation for Order #${orderId} (Invoice #${order.invoice_number}, Type: ${type})`);

            const psProcess = spawn('powershell.exe', [
                '-ExecutionPolicy', 'Bypass',
                '-File', psScript,
                '-docType', type,
                '-jsonFile', jsonPath
            ]);

            let stdoutData = '';
            let stderrData = '';

            psProcess.stdout.on('data', (data) => {
                stdoutData += data.toString();
            });

            psProcess.stderr.on('data', (data) => {
                stderrData += data.toString();
            });

            psProcess.on('close', (code) => {
                // Clean up JSON input file
                if (fs.existsSync(jsonPath)) {
                    fs.unlinkSync(jsonPath);
                }

                if (code !== 0) {
                    const errMessage = stderrData || stdoutData || `Exit code ${code}`;
                    logger.error(`PDF Generation failed via PowerShell COM for Order #${orderId}`, new Error(errMessage));
                    return reject(new Error(`Gagal memuat PDF via Excel COM: ${errMessage}`));
                }

                try {
                    const parsed = JSON.parse(stdoutData.trim());
                    if (!parsed.success) {
                        logger.error(`PDF Generation returned error for Order #${orderId}`, new Error(parsed.error));
                        return reject(new Error(parsed.error || 'Terjadi kesalahan saat generate dokumen.'));
                    }

                    // Save PDF paths in SQLite database
                    OrderModel.updatePdfPaths(orderId, parsed.data);
                    logger.info(`PDF Generation completed successfully for Order #${orderId}: ${JSON.stringify(parsed.data)}`);
                    resolve(parsed.data);
                } catch (err) {
                    logger.error(`Failed to parse PDF Generator JSON output for Order #${orderId}`, err);
                    reject(new Error(`Gagal memproses hasil generator: ${err.message}`));
                }
            });
        });
    }
}

module.exports = DocumentService;
