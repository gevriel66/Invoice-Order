const CustomerModel = require('../models/CustomerModel');

class CustomerController {
    static index(req, res) {
        const search = req.query.search || '';
        const customers = search ? CustomerModel.search(search) : CustomerModel.getAll();

        res.render('customers/index', {
            activePage: 'customers',
            customers,
            search,
            error: req.query.error || null,
            success: req.query.success || null
        });
    }

    static create(req, res) {
        try {
            const { name, company, address, phone, email } = req.body;
            if (!name) {
                return res.redirect('/customers?error=Nama+customer+wajib+diisi');
            }

            CustomerModel.create({ name, company, address, phone, email });
            res.redirect('/customers?success=Customer+berhasil+ditambahkan');
        } catch (err) {
            res.redirect(`/customers?error=${encodeURIComponent(err.message)}`);
        }
    }

    static update(req, res) {
        try {
            const { id, name, company, address, phone, email } = req.body;
            CustomerModel.update(id, { name, company, address, phone, email });
            res.redirect('/customers?success=Customer+berhasil+diperbarui');
        } catch (err) {
            res.redirect(`/customers?error=${encodeURIComponent(err.message)}`);
        }
    }

    static delete(req, res) {
        try {
            const id = req.params.id;
            CustomerModel.delete(id);
            res.redirect('/customers?success=Customer+berhasil+dihapus');
        } catch (err) {
            res.redirect(`/customers?error=${encodeURIComponent(err.message)}`);
        }
    }
}

module.exports = CustomerController;
