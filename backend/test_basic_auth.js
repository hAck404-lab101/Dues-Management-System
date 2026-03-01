const axios = require('axios');

async function testBasicAuth() {
    const key = 'SWIFTPIA2025'; // Maybe user=SWIFTPIA pass=2025
    const u = 'SWIFTPIA';
    const p = '2025';
    const auth = Buffer.from(`${u}:${p}`).toString('base64');

    try {
        console.log('--- Testing Basic Auth ---');
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
            params: {
                action: 'send-sms',
                to: '233505930906',
                sms: 'Test',
                from: 'UCC'
            },
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        console.log('Response:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function run() {
    await testBasicAuth();
    process.exit();
}
run();
