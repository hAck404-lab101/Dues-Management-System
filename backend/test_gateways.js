const axios = require('axios');

async function test(gateway) {
    try {
        console.log(`\n--- Testing Gateway=${gateway} ---`);
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
            params: {
                action: 'send-sms',
                u: 'SWIFTPIA',
                p: '2025',
                d: '233505930906',
                m: 'Test from system upgrade.',
                s: 'DiM Project',
                gateway: gateway
            }
        });
        console.log('Response:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function run() {
    await test('0');
    await test('1');
    await test('2');
    await test('3');
    process.exit();
}
run();
