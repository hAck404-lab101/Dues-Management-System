const axios = require('axios');

async function testArkeselV2() {
    const key = 'SWIFTPIA2025';
    try {
        console.log('--- Testing Arkesel V2 ---');
        const res = await axios.post('https://sms.arkesel.com/api/v2/sms/send', {
            sender: 'UCC Dues',
            message: 'Test message',
            recipients: ['233505930906']
        }, {
            headers: {
                'api-key': key
            }
        });
        console.log('Success:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) console.log('Response Data:', e.response.data);
    }
}

async function testGOnlineSitesV2() {
    const key = 'SWIFTPIA2025';
    try {
        console.log('\n--- Testing GOnlineSites V2 (Arkesel clone) ---');
        const res = await axios.post('http://sms.gonlinesites.com/api/v2/sms/send', {
            sender: 'UCC Dues',
            message: 'Test message',
            recipients: ['233505930906']
        }, {
            headers: {
                'api-key': key
            }
        });
        console.log('Success:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) console.log('Response Data:', e.response.data);
    }
}

async function run() {
    await testArkeselV2();
    await testGOnlineSitesV2();
    process.exit();
}
run();
