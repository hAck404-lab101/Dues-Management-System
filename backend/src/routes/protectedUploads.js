const express = require('express');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { isAdminRole } = require('../utils/accessControl');

const router = express.Router();

const getUploadDirectory = () => path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'));

router.get('/:filename', authenticate, async (req, res) => {
  try {
    const filename = path.basename(req.params.filename || '');

    if (!filename || filename !== req.params.filename) {
      return res.status(400).json({ success: false, message: 'Invalid file name' });
    }

    const proofPath = `/uploads/${filename}`;
    let query = `
      SELECT p.id
      FROM payments p
      INNER JOIN students s ON s.id = p.student_id
      WHERE p.proof_image_url = ?
    `;
    const params = [proofPath];

    if (!isAdminRole(req.user.role)) {
      query += ' AND s.user_id = ?';
      params.push(req.user.id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const uploadDir = getUploadDirectory();
    const filePath = path.join(uploadDir, filename);

    if (!filePath.startsWith(uploadDir) || !fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.set('Cache-Control', 'private, no-store');
    return res.sendFile(filePath);
  } catch (error) {
    console.error('Protected upload access error:', error);
    return res.status(500).json({ success: false, message: 'Unable to access file' });
  }
});

module.exports = router;
