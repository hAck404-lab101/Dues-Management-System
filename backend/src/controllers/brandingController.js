const { pool, query } = require('../config/database');

const TYPE_MAP = {
  primary: { settingKey: 'app_logo', assetKey: 'primary' },
  secondary: { settingKey: 'app_logo_secondary', assetKey: 'secondary' },
  favicon: { settingKey: 'app_favicon', assetKey: 'favicon' }
};

const ensureBrandingAssetsTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS branding_assets (
      asset_key VARCHAR(32) PRIMARY KEY,
      mime_type VARCHAR(100) NOT NULL,
      data LONGBLOB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
};

const getTypeConfig = (type) => TYPE_MAP[type] || TYPE_MAP.primary;

exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    await ensureBrandingAssetsTable();

    const { settingKey, assetKey } = getTypeConfig(req.body?.type);
    const mimeType = req.file.mimetype || 'image/png';

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO branding_assets (asset_key, mime_type, data)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           mime_type = VALUES(mime_type),
           data = VALUES(data),
           updated_at = CURRENT_TIMESTAMP`,
        [assetKey, mimeType, req.file.buffer]
      );

      const versionedUrl = `/api/settings/brand-asset/${assetKey}?v=${Date.now()}`;
      const [updateResult] = await connection.query(
        'UPDATE settings SET `value` = ? WHERE `key` = ?',
        [versionedUrl, settingKey]
      );

      if (updateResult.affectedRows === 0) {
        await connection.query(
          'INSERT INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?)',
          [settingKey, versionedUrl, 'sys_appearance', `${assetKey} branding asset`]
        );
      }

      await connection.commit();

      return res.json({
        success: true,
        message: 'Image uploaded successfully',
        data: { url: versionedUrl, type: assetKey }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Branding upload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload image' });
  }
};

exports.getBrandAsset = async (req, res) => {
  try {
    await ensureBrandingAssetsTable();

    const { assetKey } = getTypeConfig(req.params.type);
    const result = await query(
      'SELECT mime_type, data, updated_at FROM branding_assets WHERE asset_key = ? LIMIT 1',
      [assetKey]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Branding asset not found' });
    }

    const asset = result.rows[0];
    res.set('Content-Type', asset.mime_type || 'image/png');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Last-Modified', new Date(asset.updated_at || Date.now()).toUTCString());
    return res.send(asset.data);
  } catch (error) {
    console.error('Branding asset error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load branding asset' });
  }
};
