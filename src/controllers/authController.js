const UserModel = require('../models/UserModel');

class AuthController {
    static showLogin(req, res) {
        res.render('auth/login', { error: null });
    }

    static handleLogin(req, res) {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.render('auth/login', { error: 'Username dan Password wajib diisi.' });
        }

        const user = UserModel.authenticate(username, password);
        if (!user) {
            return res.render('auth/login', { error: 'Username atau Password salah.' });
        }

        req.session.user = user;
        res.redirect('/dashboard');
    }

    static logout(req, res) {
        req.session.destroy(() => {
            res.redirect('/login');
        });
    }
}

module.exports = AuthController;
