const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateUUID } = require('../utils/uuid');

exports.getStaffUsers = async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT id, email, role, is_active, created_at FROM users WHERE role != 'student' ORDER BY created_at DESC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createStaffUser = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const existing = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const id = generateUUID();
        const hash = await bcrypt.hash(password, 10);

        await pool.query(
            'INSERT INTO users (id, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, true)',
            [id, email, hash, role]
        );

        res.status(201).json({ success: true, message: 'Staff user created' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateStaffUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_active, password } = req.body;

        const fields = [];
        const params = [];

        if (role) { fields.push('role = ?'); params.push(role); }
        if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active); }
        if (password) {
            const hash = await bcrypt.hash(password, 10);
            fields.push('password_hash = ?');
            params.push(hash);
        }

        if (fields.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

        params.push(id);
        const result = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role != 'student'`,
            params
        );

        if (result.rows.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'User not found or is a student' });
        }

        res.json({ success: true, message: 'User updated' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteStaffUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id === req.user.id) return res.status(400).json({ success: false, message: 'Cannot delete yourself' });

        await pool.query("DELETE FROM users WHERE id = ? AND role != 'student'", [id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
