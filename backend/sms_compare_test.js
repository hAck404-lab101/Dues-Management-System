const axios = require('axios');

async function run() {
    const u = 'SWIFTPIA';
    const p = '2025';

    console.log('--- Test A: d, m, s ---');
    const resA = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
        params: { action: 'send-sms', u, p, d: '233505930906', m: 'Test A', s: 'UCC' }
    });
    console.log('Result A:', resA.data);

    console.log('\n--- Test B: to, msg, sender ---');
    const resB = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
        params: { action: 'send-sms', u, p, to: '233505930906', msg: 'Test B', sender: 'UCC' }
    });
    console.log('Result B:', resB.data);

    process.exit();
}
run();
