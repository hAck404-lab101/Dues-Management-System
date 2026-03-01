const { query } = require('./src/config/database');
async function test() {
    try {
        const { rows } = await query('SELECT email, role FROM users');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
