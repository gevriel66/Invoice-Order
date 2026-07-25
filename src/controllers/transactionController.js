const OrderModel = require('../models/OrderModel');
const CustomerModel = require('../models/CustomerModel');
const ProductModel = require('../models/ProductModel');

class TransactionController {
    static index(req, res) {
        const filters = {
            search: req.query.search || '',
            status: req.query.status || ''
        };
        const orders = OrderModel.getAll(filters);
        const counts = OrderModel.getCounts();

        res.render('transactions/index', {
            activePage: 'transactions',
            orders,
            counts,
            filters,
            error: req.query.error || null,
            success: req.query.success || null
        });
    }

    static showCreate(req, res) {
        const customers = CustomerModel.getAll();
        const products = ProductModel.getAll();
        const todayStr = new Date().toISOString().split('T')[0];

        res.render('transactions/create', {
            activePage: 'create-transaction',
            customers,
            products,
            todayStr,
            error: req.query.error || null
        });
    }

    static handleCreate(req, res) {
        try {
            const body = req.body;
            if (!body.customer_name_snapshot && !body.customer_id) {
                return res.redirect('/transactions/create?error=Pelanggan+wajib+dipilih+atau+diisi');
            }

            // Parse line items from dynamic form arrays
            const items = [];
            if (Array.isArray(body.product_name)) {
                for (let i = 0; i < body.product_name.length; i++) {
                    if (body.product_name[i] && body.product_name[i].trim()) {
                        items.push({
                            product_id: body.product_id[i] || null,
                            product_code_snapshot: body.product_code[i] || '',
                            product_name_snapshot: body.product_name[i].trim(),
                            price_snapshot: Number(body.price[i]) || 0,
                            unit_snapshot: body.unit[i] || 'PCS',
                            brand: body.brand[i] || '',
                            quantity: Number(body.quantity[i]) || 1
                        });
                    }
                }
            } else if (body.product_name && body.product_name.trim()) {
                items.push({
                    product_id: body.product_id || null,
                    product_code_snapshot: body.product_code || '',
                    product_name_snapshot: body.product_name.trim(),
                    price_snapshot: Number(body.price) || 0,
                    unit_snapshot: body.unit || 'PCS',
                    brand: body.brand || '',
                    quantity: Number(body.quantity) || 1
                });
            }

            if (items.length === 0) {
                return res.redirect('/transactions/create?error=Minimal+harus+ada+1+produk+dalam+transaksi');
            }

            const orderData = {
                order_date: body.order_date,
                due_date: body.due_date,
                po_number: body.po_number,
                ref_number: body.ref_number,
                customer_id: body.customer_id || null,
                customer_name_snapshot: body.customer_name_snapshot,
                customer_company_snapshot: body.customer_company_snapshot || '',
                customer_address_snapshot: body.customer_address_snapshot || '',
                customer_phone_snapshot: body.customer_phone_snapshot || '',
                sender_info: body.sender_info,
                recipient_info: body.recipient_info,
                notes: body.notes,
                status: body.action_status === 'FINAL' ? 'FINAL' : 'DRAFT',
                items
            };

            const orderId = OrderModel.create(orderData);
            const statusMsg = orderData.status === 'FINAL' ? 'Transaksi+berhasil+disimpan+dan+difinalkan' : 'Draft+transaksi+berhasil+disimpan';
            res.redirect(`/transactions/${orderId}?success=${statusMsg}`);
        } catch (err) {
            res.redirect(`/transactions/create?error=${encodeURIComponent(err.message)}`);
        }
    }

    static showDetail(req, res) {
        const order = OrderModel.getById(req.params.id);
        if (!order) {
            return res.redirect('/transactions?error=Transaksi+tidak+ditemukan');
        }

        res.render('transactions/show', {
            activePage: 'transactions',
            order,
            error: req.query.error || null,
            success: req.query.success || null
        });
    }

    static showEdit(req, res) {
        const order = OrderModel.getById(req.params.id);
        if (!order) {
            return res.redirect('/transactions?error=Transaksi+tidak+ditemukan');
        }
        if (order.status !== 'DRAFT') {
            return res.redirect(`/transactions/${order.id}?error=Hanya+transaksi+berstatus+DRAFT+yang+dapat+diedit`);
        }

        const customers = CustomerModel.getAll();
        const products = ProductModel.getAll();

        res.render('transactions/edit', {
            activePage: 'transactions',
            order,
            customers,
            products,
            error: req.query.error || null
        });
    }

    static handleUpdate(req, res) {
        try {
            const id = req.params.id;
            const body = req.body;

            const items = [];
            if (Array.isArray(body.product_name)) {
                for (let i = 0; i < body.product_name.length; i++) {
                    if (body.product_name[i] && body.product_name[i].trim()) {
                        items.push({
                            product_id: body.product_id[i] || null,
                            product_code_snapshot: body.product_code[i] || '',
                            product_name_snapshot: body.product_name[i].trim(),
                            price_snapshot: Number(body.price[i]) || 0,
                            unit_snapshot: body.unit[i] || 'PCS',
                            brand: body.brand[i] || '',
                            quantity: Number(body.quantity[i]) || 1
                        });
                    }
                }
            } else if (body.product_name && body.product_name.trim()) {
                items.push({
                    product_id: body.product_id || null,
                    product_code_snapshot: body.product_code || '',
                    product_name_snapshot: body.product_name.trim(),
                    price_snapshot: Number(body.price) || 0,
                    unit_snapshot: body.unit || 'PCS',
                    brand: body.brand || '',
                    quantity: Number(body.quantity) || 1
                });
            }

            if (items.length === 0) {
                return res.redirect(`/transactions/${id}/edit?error=Minimal+harus+ada+1+produk+dalam+transaksi`);
            }

            const orderData = {
                order_date: body.order_date,
                due_date: body.due_date,
                po_number: body.po_number,
                ref_number: body.ref_number,
                customer_id: body.customer_id || null,
                customer_name_snapshot: body.customer_name_snapshot,
                customer_company_snapshot: body.customer_company_snapshot || '',
                customer_address_snapshot: body.customer_address_snapshot || '',
                customer_phone_snapshot: body.customer_phone_snapshot || '',
                sender_info: body.sender_info,
                recipient_info: body.recipient_info,
                notes: body.notes,
                items
            };

            OrderModel.update(id, orderData);
            res.redirect(`/transactions/${id}?success=Draft+transaksi+berhasil+diperbarui`);
        } catch (err) {
            res.redirect(`/transactions/${req.params.id}/edit?error=${encodeURIComponent(err.message)}`);
        }
    }

    static updateStatus(req, res) {
        try {
            const id = req.params.id;
            const { status } = req.body;
            OrderModel.updateStatus(id, status);

            const msg = status === 'FINAL' ? 'Transaksi+berhasil+difinalkan+dan+Nomor+Invoice+resmi+tergenerasi' : 'Status+transaksi+berhasil+diubah';
            res.redirect(`/transactions/${id}?success=${msg}`);
        } catch (err) {
            res.redirect(`/transactions/${req.params.id}?error=${encodeURIComponent(err.message)}`);
        }
    }

    static apiSearchCustomers(req, res) {
        const query = req.query.q || '';
        const customers = query ? CustomerModel.search(query) : CustomerModel.getAll();
        res.json({ success: true, data: customers });
    }
}

module.exports = TransactionController;
