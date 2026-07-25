const UnitModel = require('../models/UnitModel');

class UnitController {
    static index(req, res) {
        const units = UnitModel.getAll();
        res.render('units/index', {
            activePage: 'units',
            units,
            error: req.query.error || null,
            success: req.query.success || null
        });
    }

    static create(req, res) {
        try {
            const { name, code, description } = req.body;
            if (!name || !code) {
                return res.redirect('/units?error=Nama+dan+Kode+satuan+wajib+diisi');
            }
            UnitModel.create({ name, code, description });
            res.redirect('/units?success=Satuan+berhasil+ditambahkan');
        } catch (err) {
            res.redirect(`/units?error=${encodeURIComponent(err.message)}`);
        }
    }

    static update(req, res) {
        try {
            const { id, name, code, description } = req.body;
            UnitModel.update(id, { name, code, description });
            res.redirect('/units?success=Satuan+berhasil+diperbarui');
        } catch (err) {
            res.redirect(`/units?error=${encodeURIComponent(err.message)}`);
        }
    }

    static delete(req, res) {
        try {
            const id = req.params.id;
            UnitModel.delete(id);
            res.redirect('/units?success=Satuan+berhasil+dihapus');
        } catch (err) {
            res.redirect(`/units?error=${encodeURIComponent(err.message)}`);
        }
    }
}

module.exports = UnitController;
