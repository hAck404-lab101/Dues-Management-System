const axios = require('axios');

async function test() {
    const key = 'SWIFTPIA2025';
    const to = '233505930906';
    const msg = 'Test message';
    const sender = 'DiM Project';

    console.log('--- Testing GOnlineSites (apikey, http) ---');
    try {
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
            params: {
                action: 'send-sms',
                apikey: key,
                to,
                from: sender,
                sms: msg
            }
        });
        console.log('Response:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
    }
}
test();
