const { pool } = require('../config/database');
const { generateUUID } = require('../utils/uuid');
const sysLog = require('../lib/systemLogger');

exports.getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20, is_published } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let sql = 'SELECT a.*, u.email as creator_email FROM announcements a INNER JOIN users u ON a.created_by = u.id WHERE 1=1';
    const params = [];

    if (is_published !== undefined) {
      sql += ' AND a.is_published = ?';
      params.push(is_published === 'true' ? 1 : 0);
    }

    const countResult = await pool.query(sql.replace('a.*, u.email as creator_email', 'COUNT(*) as total'), params);
    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);

    const result = await pool.query(sql, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: Number(countResult.rows[0].total || 0),
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(Number(countResult.rows[0].total || 0) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Fetch announcements error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createAnnouncement = async (req, res) => {
  try {
    const { title, body, audience, is_published } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    const id = generateUUID();
    const created_by = req.user.id;
    const published = is_published === true || is_published === 'true';
    const published_at = published ? new Date() : null;

    await pool.query(
      `INSERT INTO announcements (id, title, body, created_by, audience, is_published, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title, body, created_by, audience || 'all_staff', published ? 1 : 0, published_at]
    );

    await sysLog.info('auth', 'announcement.create', `Announcement draft created: ${title}`, { id, title }, { userId: created_by });

    res.json({
      success: true,
      message: 'Announcement created successfully',
      data: { id, title, body, audience, is_published: published }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, audience, is_published } = req.body;

    const existRes = await pool.query('SELECT * FROM announcements WHERE id = ? LIMIT 1', [id]);
    if (existRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const current = existRes.rows[0];
    const newTitle = title !== undefined ? title : current.title;
    const newBody = body !== undefined ? body : current.body;
    const newAudience = audience !== undefined ? audience : current.audience;
    
    let newPublished = current.is_published;
    let newPublishedAt = current.published_at;

    if (is_published !== undefined) {
      newPublished = is_published === true || is_published === 'true' ? 1 : 0;
      if (newPublished && !current.is_published) {
        newPublishedAt = new Date();
      } else if (!newPublished) {
        newPublishedAt = null;
      }
    }

    await pool.query(
      `UPDATE announcements 
       SET title = ?, body = ?, audience = ?, is_published = ?, published_at = ?
       WHERE id = ?`,
      [newTitle, newBody, newAudience, newPublished, newPublishedAt, id]
    );

    await sysLog.info('auth', 'announcement.update', `Announcement updated: ${newTitle}`, { id, title: newTitle }, { userId: req.user.id });

    res.json({
      success: true,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const existRes = await pool.query('SELECT * FROM announcements WHERE id = ? LIMIT 1', [id]);
    if (existRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await pool.query('DELETE FROM announcements WHERE id = ?', [id]);

    await sysLog.info('auth', 'announcement.delete', `Announcement deleted: ${existRes.rows[0].title}`, { id }, { userId: req.user.id });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
