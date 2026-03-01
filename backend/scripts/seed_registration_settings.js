const { pool } = require('../src/config/database');

const registrationSettings = [
    {
        key: 'available_academic_years',
        value: '2023/2024, 2024/2025',
        category: 'registration',
        description: 'Comma-separated list of academic years available for student registration and management.'
    },
    {
        key: 'available_programmes',
        value: 'Computer Science, Information Technology, Cyber Security',
        category: 'registration',
        description: 'Comma-separated list of programmes available for student selection.'
    },
    {
        key: 'registration_status',
        value: 'open',
        category: 'registration',
        description: 'Global status of student registration (open or closed).'
    }
];

async function seed() {
    const conn = await pool.getConnection();
    try {
        for (const s of registrationSettings) {
            // Check if exists, if not insert. If exists, don't overwrite if it has a value (except category/description)
            const [existing] = await conn.query('SELECT `key` FROM settings WHERE `key` = ?', [s.key]);

            if (existing && existing.length > 0) {
                await conn.query(
                    'UPDATE settings SET category = ?, description = ? WHERE `key` = ?',
                    [s.category, s.description, s.key]
                );
                console.log(`✓ Updated metadata for ${s.key}`);
            } else {
                await conn.query(
                    'INSERT INTO settings (`key`, `value`, `category`, `description`) VALUES (?, ?, ?, ?)',
                    [s.key, s.value, s.category, s.description]
                );
                console.log(`✓ Created ${s.key}`);
            }
        }
    } catch (err) {
        console.error('Seed error:', err);
    } finally {
        conn.release();
        process.exit();
    }
}
seed();
