const db = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
    static findByUsername(username) {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    }

    static authenticate(username, password) {
        const user = this.findByUsername(username);
        if (!user) return null;

        const isMatch = bcrypt.compareSync(password, user.password_hash);
        if (!isMatch) return null;

        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
        };
    }
}

module.exports = UserModel;
