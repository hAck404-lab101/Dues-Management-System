const axios = require('axios');

async function test(u, p) {
    try {
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
            params: { action: 'send-sms', u, p, d: '233505930906', m: 'Test', s: 'UCC' }
        });
        console.log(`[u=${u}, p=${p}]:`, res.data);
    } catch (e) {
        console.log(`Error:`, e.message);
    }
}

async function run() {
    await test('SWIFTPIA', '2025');
    await test('SWIFTPIA', 'WRONG');
    process.exit();
}
run();
