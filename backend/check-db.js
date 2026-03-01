const { query } = require('./src/config/database');
async function test() {
    try {
        const { rows } = await query('SELECT * FROM settings WHERE category = "payment"');
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    }
}
test();
