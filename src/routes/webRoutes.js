const express = require('express');
const router = express.Router();
const { requireAuth, redirectIfAuth } = require('../middleware/authMiddleware');
const loginRateLimiter = require('../middleware/rateLimitMiddleware');

const AuthController = require('../controllers/authController');
const DashboardController = require('../controllers/dashboardController');
const UnitController = require('../controllers/unitController');
const ProductController = require('../controllers/productController');
const CustomerController = require('../controllers/customerController');
const TransactionController = require('../controllers/transactionController');
const DocumentController = require('../controllers/documentController');

// Guest / Authentication Routes
router.get('/', redirectIfAuth, (req, res) => res.redirect('/login'));
router.get('/login', redirectIfAuth, AuthController.showLogin);
router.post('/login', loginRateLimiter, redirectIfAuth, AuthController.handleLogin);
router.get('/logout', AuthController.logout);

// Authenticated Routes
router.use(requireAuth);

// Dashboard
router.get('/dashboard', DashboardController.showDashboard);

// Master Satuan (Units) CRUD
router.get('/units', UnitController.index);
router.post('/units/create', UnitController.create);
router.post('/units/update', UnitController.update);
router.post('/units/delete/:id', UnitController.delete);

// Master Produk CRUD & Search API
router.get('/products', ProductController.index);
router.post('/products/create', ProductController.create);
router.post('/products/update', ProductController.update);
router.post('/products/delete/:id', ProductController.delete);
router.get('/api/products/search', ProductController.apiSearch);

// Master Customer CRUD & Search API
router.get('/customers', CustomerController.index);
router.post('/customers/create', CustomerController.create);
router.post('/customers/update', CustomerController.update);
router.post('/customers/delete/:id', CustomerController.delete);
router.get('/api/customers/search', TransactionController.apiSearchCustomers);

// Transactions (Orders) Routes - Milestone 2
router.get('/transactions', TransactionController.index);
router.get('/transactions/create', TransactionController.showCreate);
router.post('/transactions/create', TransactionController.handleCreate);
router.get('/transactions/:id', TransactionController.showDetail);
router.get('/transactions/:id/edit', TransactionController.showEdit);
router.post('/transactions/:id/edit', TransactionController.handleUpdate);
router.post('/transactions/:id/status', TransactionController.updateStatus);

// Document Generation & Download Routes - Milestone 3
router.post('/transactions/:id/generate-pdf', DocumentController.generatePDF);
router.get('/documents/invoice/:id', DocumentController.downloadInvoice);
router.get('/documents/surat-jalan/:id', DocumentController.downloadSuratJalan);

module.exports = router;
