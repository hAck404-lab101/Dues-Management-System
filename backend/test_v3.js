const axios = require('axios');

async function testGOnlineSitesV3() {
    const key = 'SWIFTPIA2025';
    try {
        console.log('--- Testing GOnlineSites V3 ---');
        const res = await axios.post('https://sms.gonlinesites.com/api/v3/sms/send', {
            recipient: '233505930906',
            sender_id: 'UCC Dues',
            message: 'Test message from system upgrade.'
        }, {
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        console.log('Success:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) {
            console.log('Response Status:', e.response.status);
            console.log('Response Data:', e.response.data);
        }
    }
}

async function run() {
    await testGOnlineSitesV3();
    process.exit();
}
run();
