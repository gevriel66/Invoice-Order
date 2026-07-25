const ProductModel = require('../models/ProductModel');
const UnitModel = require('../models/UnitModel');

class ProductController {
    static index(req, res) {
        const search = req.query.search || '';
        const products = search ? ProductModel.search(search) : ProductModel.getAll();
        const units = UnitModel.getAll();

        res.render('products/index', {
            activePage: 'products',
            products,
            units,
            search,
            error: req.query.error || null,
            success: req.query.success || null
        });
    }

    static create(req, res) {
        try {
            const { code, name, price, unit_id, brand, description } = req.body;
            if (!name || price === undefined) {
                return res.redirect('/products?error=Nama+produk+dan+Harga+wajib+diisi');
            }

            ProductModel.create({ code, name, price, unit_id, brand, description });
            res.redirect('/products?success=Produk+berhasil+ditambahkan');
        } catch (err) {
            res.redirect(`/products?error=${encodeURIComponent(err.message)}`);
        }
    }

    static update(req, res) {
        try {
            const { id, code, name, price, unit_id, brand, description } = req.body;
            ProductModel.update(id, { code, name, price, unit_id, brand, description });
            res.redirect('/products?success=Produk+berhasil+diperbarui');
        } catch (err) {
            res.redirect(`/products?error=${encodeURIComponent(err.message)}`);
        }
    }

    static delete(req, res) {
        try {
            const id = req.params.id;
            ProductModel.delete(id);
            res.redirect('/products?success=Produk+berhasil+dihapus');
        } catch (err) {
            res.redirect(`/products?error=${encodeURIComponent(err.message)}`);
        }
    }

    // JSON API Endpoint for Autocomplete in Milestone 2
    static apiSearch(req, res) {
        const query = req.query.q || '';
        const products = query ? ProductModel.search(query) : ProductModel.getAll();
        res.json({ success: true, data: products });
    }
}

module.exports = ProductController;
