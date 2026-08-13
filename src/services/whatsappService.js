const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
const VisionService = require('./visionService');
const OrderModel = require('../models/OrderModel');
const DocumentService = require('./documentService');
const logger = require('../utils/logger');

class WhatsAppService {
    static init() {
        if (process.env.ENABLE_WA_BOT !== 'true') {
            logger.info('WhatsApp Bot is disabled in .env (ENABLE_WA_BOT != true). Skipping init.');
            return;
        }

        logger.info('Initializing WhatsApp Bot Client...');

        // Clean any background orphan Chrome processes on Windows VPS
        if (process.platform === 'win32') {
            try {
                const { execSync } = require('child_process');
                execSync('taskkill /F /IM chrome.exe /T 2>nul', { stdio: 'ignore' });
            } catch (e) {}
        }

        // Clean stale Chrome lock files from previous force-killed processes
        const sessionDir = path.resolve(process.cwd(), 'storage/wa_session/session-invoice-bot-session');
        ['SingletonLock', 'DevToolsActivePort', 'LOCK'].forEach(lockName => {
            const lockPath = path.join(sessionDir, lockName);
            if (fs.existsSync(lockPath)) {
                try { fs.unlinkSync(lockPath); } catch (e) {}
            }
        });

        const client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'invoice-bot-session',
                dataPath: path.resolve(process.cwd(), 'storage/wa_session')
            }),
            takeoverOnConflict: true,
            takeoverTimeoutMs: 0,
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            }
        });

        client.on('qr', (qr) => {
            logger.info('==================================================');
            logger.info('  Scan WhatsApp QR Code below to connect Bot:');
            logger.info('==================================================');
            qrcode.generate(qr, { small: true });
        });

        let isReadyLogged = false;

        client.on('loading_screen', (percent, message) => {
            logger.info(`[WA SYNC] Progress: ${percent}% - ${message || 'Syncing chats...'}`);
            if (percent === 100 && !isReadyLogged) {
                isReadyLogged = true;
                logger.info('==================================================');
                logger.info('  WhatsApp Bot is READY & Listening for PO Photos!');
                logger.info('==================================================');
            }
        });

        client.on('change_state', (state) => {
            logger.info(`[WA STATE] Current State: ${state}`);
        });

        client.on('ready', () => {
            if (!isReadyLogged) {
                isReadyLogged = true;
                logger.info('==================================================');
                logger.info('  WhatsApp Bot is READY & Listening for PO Photos!');
                logger.info('==================================================');
            }
        });

        client.on('authenticated', () => {
            logger.info('WhatsApp Bot Authenticated Successfully.');
        });

        client.on('auth_failure', (msg) => {
            logger.error('WhatsApp Bot Auth Failure:', new Error(msg));
            if (process.platform === 'win32') {
                try {
                    const { execSync } = require('child_process');
                    execSync('taskkill /F /IM chrome.exe /T 2>nul', { stdio: 'ignore' });
                } catch (e) {}
            }
        });

        client.on('disconnected', (reason) => {
            logger.warn(`WhatsApp Bot Disconnected: ${reason}`);
            if (process.platform === 'win32') {
                try {
                    const { execSync } = require('child_process');
                    execSync('taskkill /F /IM chrome.exe /T 2>nul', { stdio: 'ignore' });
                } catch (e) {}
            }
        });

        client.on('message_create', async (msg) => {
            try {
                // Check if message contains an image / photo
                if (msg.hasMedia && (msg.type === 'image' || msg.type === 'sticker')) {
                    // Download image media from WhatsApp with multi-method fallback
                    let media = null;

                    // Method 1: Try extracting inline base64 data from msg._data.body if available
                    if (msg._data && msg._data.body && typeof msg._data.body === 'string' && msg._data.body.length > 50) {
                        try {
                            media = new MessageMedia('image/jpeg', msg._data.body, 'wa_po_image.jpg');
                            logger.info('Successfully extracted media via msg._data.body inline base64!');
                        } catch (errInline) {
                            logger.warn(`Inline base64 extraction failed: ${errInline.message}`);
                        }
                    }

                    // Method 2: Try native downloadMedia()
                    if (!media || !media.data) {
                        try {
                            media = await msg.downloadMedia();
                        } catch (err1) {
                            logger.warn(`Native downloadMedia failed: ${err1.message}`);
                        }
                    }

                    // Method 3: Try fetching via Puppeteer page Store (renderableUrl / DownloadManager)
                    if (!media || !media.data) {
                        try {
                            const rawMedia = await client.pupPage.evaluate(async (msgId) => {
                                try {
                                    const msgObj = window.Store.Msg.get(msgId);
                                    if (!msgObj) return null;

                                    // 3a. Try renderableUrl / previewUrl
                                    const url = (msgObj.mediaData && msgObj.mediaData.renderableUrl) || msgObj.deprecatedMms3Url;
                                    if (url && url.startsWith('blob:')) {
                                        const res = await fetch(url);
                                        const blob = await res.blob();
                                        return new Promise(resolve => {
                                            const reader = new FileReader();
                                            reader.onloadend = () => resolve({
                                                mimetype: msgObj.mimetype || 'image/jpeg',
                                                data: reader.result ? reader.result.split(',')[1] : ''
                                            });
                                            reader.readAsDataURL(blob);
                                        });
                                    }

                                    // 3b. Try DownloadManager downloadAndDecrypt
                                    if (window.Store.DownloadManager && window.Store.DownloadManager.downloadAndDecrypt) {
                                        const decrypted = await window.Store.DownloadManager.downloadAndDecrypt({
                                            directPath: msgObj.directPath,
                                            encFilehash: msgObj.encFilehash,
                                            filehash: msgObj.filehash,
                                            mediaKey: msgObj.mediaKey,
                                            type: msgObj.type,
                                            signal: (new AbortController()).signal
                                        });
                                        if (decrypted) {
                                            const blob = new Blob([decrypted], { type: msgObj.mimetype || 'image/jpeg' });
                                            return new Promise(resolve => {
                                                const reader = new FileReader();
                                                reader.onloadend = () => resolve({
                                                    mimetype: msgObj.mimetype || 'image/jpeg',
                                                    data: reader.result ? reader.result.split(',')[1] : ''
                                                });
                                                reader.readAsDataURL(blob);
                                            });
                                        }
                                    }
                                    return null;
                                } catch (e) {
                                    return null;
                                }
                            }, msg.id._serialized);

                            if (rawMedia && rawMedia.data) {
                                media = new MessageMedia(rawMedia.mimetype, rawMedia.data, 'wa_po_image.jpg');
                                logger.info('Successfully extracted media via Puppeteer Store fallback!');
                            }
                        } catch (errEval) {
                            logger.warn(`Puppeteer Store fallback failed: ${errEval.message}`);
                        }
                    }

                    if (!media || !media.data) {
                        logger.warn(`Media extraction failed across all methods. Msg Details: type=${msg.type}, hasMedia=${msg.hasMedia}, fromMe=${msg.fromMe}, _dataKeys=${Object.keys(msg._data || {}).join(',')}`);
                        return await msg.reply('❌ Gagal mengunduh gambar dari WhatsApp. Silakan kirim ulang.');
                    }

                    await msg.reply('⏳ *Foto PO Diterima!* Sedang memproses AI Scanning & pembuatan dokumen PDF...');

                    const tempDir = process.env.TEMP_DIR 
                        ? path.resolve(process.cwd(), process.env.TEMP_DIR)
                        : path.resolve(process.cwd(), 'temp');

                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }

                    const ext = media.mimetype ? media.mimetype.split('/')[1].split(';')[0] : 'jpg';
                    const tempImgPath = path.join(tempDir, `wa_po_${Date.now()}.${ext}`);
                    
                    fs.writeFileSync(tempImgPath, media.data, { encoding: 'base64' });
                    logger.info(`Saved WA PO image to temp: ${tempImgPath}`);

                    // 1. Parse Image via Vision AI OCR
                    const poData = await VisionService.parsePOImage(tempImgPath);

                    // Clean up temp image
                    if (fs.existsSync(tempImgPath)) {
                        fs.unlinkSync(tempImgPath);
                    }

                    // 2. Prepare Order Data (Status = FINAL, sender_info = Grocery Kuliner Nusantara for Invoice)
                    const orderData = {
                        status: 'FINAL',
                        customer_name_snapshot: poData.customer_name_snapshot,
                        customer_company_snapshot: poData.customer_company_snapshot,
                        customer_address_snapshot: '',
                        customer_phone_snapshot: '',
                        order_date: poData.order_date, // 7 days before due_date
                        due_date: poData.due_date,
                        po_number: poData.po_number,
                        ref_number: '',
                        sender_info: 'Grocery Kuliner Nusantara',
                        recipient_info: '',
                        notes: 'Barang yang sudah dibeli tidak dapat ditukar atau di kembalikan',
                        items: poData.items
                    };

                    // 3. Create Order in SQLite
                    const orderId = OrderModel.create(orderData);
                    const order = OrderModel.getById(orderId);

                    logger.info(`WhatsApp Bot created Order #${orderId} (Invoice: ${order.invoice_number})`);

                    // 4. Generate Both PDFs via Excel COM Engine
                    const pdfResult = await DocumentService.generateDocument(orderId, 'both');

                    // 5. Send Success Summary Text & Attach PDFs
                    const totalFormatted = Number(order.total_amount).toLocaleString('id-ID');
                    let itemsSummary = '';
                    order.items.forEach((it, idx) => {
                        itemsSummary += `\n  ${idx + 1}. *${it.product_name_snapshot}* (${it.quantity} ${it.unit_snapshot} @ Rp ${Number(it.price_snapshot).toLocaleString('id-ID')})`;
                    });

                    const replyText = `✅ *Invoice & Surat Jalan Berhasil Dibuat!*\n\n` +
                        `📄 *Nomor Invoice:* ${order.invoice_number}\n` +
                        `📋 *No. PO:* ${order.po_number}\n` +
                        `👤 *Pelanggan:* ${order.customer_name_snapshot}\n` +
                        `📅 *Tgl Transaksi:* ${order.order_date} _(7 hari sebelum Due Date ${order.due_date})_\n` +
                        `🛒 *Rincian Barang:*${itemsSummary}\n\n` +
                        `💰 *TOTAL:* *Rp ${totalFormatted}*\n\n` +
                        ` Dokumen PDF Invoice & Surat Jalan terlampir di bawah ini.`;

                    await client.sendMessage(msg.from, replyText);

                    // Attach Invoice PDF
                    if (pdfResult.invoice_pdf_path) {
                        const fullInvPath = path.resolve(process.cwd(), pdfResult.invoice_pdf_path);
                        if (fs.existsSync(fullInvPath)) {
                            const mediaInv = MessageMedia.fromFilePath(fullInvPath);
                            await client.sendMessage(msg.from, mediaInv, { caption: `Invoice_${order.invoice_number.replace('/', '_')}.pdf` });
                        }
                    }

                    // Attach Surat Jalan PDF
                    if (pdfResult.surat_jalan_pdf_path) {
                        const fullSjPath = path.resolve(process.cwd(), pdfResult.surat_jalan_pdf_path);
                        if (fs.existsSync(fullSjPath)) {
                            const mediaSj = MessageMedia.fromFilePath(fullSjPath);
                            await client.sendMessage(msg.from, mediaSj, { caption: `Surat_Jalan_${order.invoice_number.replace('/', '_')}.pdf` });
                        }
                    }

                    logger.info(`Successfully replied WA chat ${msg.from} with generated PDFs for Order #${orderId}`);
                }
            } catch (err) {
                logger.error(`WhatsApp Bot Message Processing Error: ${err.message}`, err);
                try {
                    await msg.reply(`❌ *Gagal memproses PO:* ${err.message}`);
                } catch (e) {}
            }
        });

        client.initialize();
    }
}

module.exports = WhatsAppService;
