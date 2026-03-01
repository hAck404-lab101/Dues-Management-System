const axios = require('axios');

async function testHubtel() {
    const u = 'SWIFTPIA';
    const p = '2025';
    const auth = Buffer.from(`${u}:${p}`).toString('base64');

    try {
        console.log('--- Testing Hubtel V1 ---');
        const res = await axios.get('https://api.hubtel.com/v1/messages/send', {
            params: {
                From: 'UCC',
                To: '233505930906',
                Content: 'Test'
            },
            headers: {
                'Authorization': `Basic ${auth}`
            }
        });
        console.log('Response:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) console.log('Response Data:', e.response.data);
    }
}

async function run() {
    await testHubtel();
    process.exit();
}
run();
