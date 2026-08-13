const path = require('path');
const fs = require('fs');
const OrderModel = require('../models/OrderModel');
const DocumentService = require('../services/documentService');

class DocumentController {
    static async generatePDF(req, res) {
        try {
            const id = req.params.id;
            const docType = req.body.doc_type || 'both'; // 'invoice', 'surat_jalan', or 'both'

            await DocumentService.generateDocument(id, docType);
            const msg = docType === 'invoice' 
                ? 'Invoice+PDF+berhasil+ter-generate' 
                : (docType === 'surat_jalan' ? 'Surat+Jalan+PDF+berhasil+ter-generate' : 'Seluruh+Dokumen+PDF+berhasil+ter-generate');

            res.redirect(`/transactions/${id}?success=${msg}`);
        } catch (err) {
            res.redirect(`/transactions/${req.params.id}?error=${encodeURIComponent(err.message)}`);
        }
    }

    static downloadInvoice(req, res) {
        const order = OrderModel.getById(req.params.id);
        if (!order || !order.invoice_pdf_path) {
            return res.redirect('/transactions?error=File+Invoice+PDF+belum+dibuat');
        }

        const baseStorageDir = path.resolve(__dirname, '../../storage');
        const fullPath = path.resolve(__dirname, '../../', order.invoice_pdf_path);

        if (!fullPath.startsWith(baseStorageDir)) {
            return res.redirect(`/transactions/${req.params.id}?error=Akses+file+ditolak+karena+alasan+keamanan`);
        }

        if (!fs.existsSync(fullPath)) {
            return res.redirect(`/transactions/${req.params.id}?error=File+PDF+Invoice+tidak+ditemukan+di+storage`);
        }

        res.download(fullPath);
    }

    static downloadSuratJalan(req, res) {
        const order = OrderModel.getById(req.params.id);
        if (!order || !order.surat_jalan_pdf_path) {
            return res.redirect('/transactions?error=File+Surat+Jalan+PDF+belum+dibuat');
        }

        const baseStorageDir = path.resolve(__dirname, '../../storage');
        const fullPath = path.resolve(__dirname, '../../', order.surat_jalan_pdf_path);

        if (!fullPath.startsWith(baseStorageDir)) {
            return res.redirect(`/transactions/${req.params.id}?error=Akses+file+ditolak+karena+alasan+keamanan`);
        }

        if (!fs.existsSync(fullPath)) {
            return res.redirect(`/transactions/${req.params.id}?error=File+PDF+Surat+Jalan+tidak+ditemukan+di+storage`);
        }

        res.download(fullPath);
    }
}

module.exports = DocumentController;
