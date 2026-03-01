const axios = require('axios');

async function test(name, url, params) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        const res = await axios.get(url, { params, timeout: 5000 });
        console.log('Response:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function run() {
    const key = 'SWIFTPIA2025';
    const to = '233505930906';
    const msg = 'Test message';
    const sender = 'UCC';

    // SmsOnlineGh
    await test('SmsOnlineGh', 'http://smsonlinegh.com/smsapi', { key, to, msg, sender });

    // USMS-GH
    await test('USMS-GH', 'http://usmsgh.com/smsapi', { key, to, msg, sender });

    // DreamWeb
    await test('DreamWeb', 'http://telecom.dreamwebghana.com/smsapi', { key, to, msg, sender });

    process.exit();
}
run();
