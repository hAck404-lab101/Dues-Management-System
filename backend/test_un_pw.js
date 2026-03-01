const axios = require('axios');

async function test(u, p) {
    try {
        console.log(`\n--- Testing u=${u}, p=${p} ---`);
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
            params: {
                action: 'send-sms',
                u,
                p,
                d: '233505930906',
                m: 'Test from system upgrade.',
                s: 'DiM Project'
            }
        });
        console.log('Response:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function run() {
    await test('SWIFTPIA', '2025');
    await test('SWIFTPIA2025', '');
    await test('info@gonlinesites.com', 'SWIFTPIA2025');
    process.exit();
}
run();
