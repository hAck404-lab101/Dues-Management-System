const axios = require('axios');

async function test(params) {
    try {
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', { params, timeout: 5000 });
        console.log(`PARAMS: ${JSON.stringify(params)} -> DATA: ${JSON.stringify(res.data)}`);
    } catch (e) {
        console.log(`PARAMS: ${JSON.stringify(params)} -> ERROR: ${e.message}`);
    }
}

async function run() {
    const u = 'SWIFTPIA';
    const p = '2025';
    const d = '233505930906';
    const m = 'Test message';

    console.log('--- Testing SENDER ID ---');
    await test({ action: 'send-sms', u, p, d, m, s: 'DiM Project' });
    await test({ action: 'send-sms', u, p, d, m, s: 'UCC Dues' });
    await test({ action: 'send-sms', u, p, d, m, s: '23324262579' }); // Numeric sender
    await test({ action: 'send-sms', u, p, d, m, s: '' }); // Empty sender

    console.log('\n--- Testing Gateway/Type ---');
    await test({ action: 'send-sms', u, p, d, m, s: 'UCC', gateway: '1' });
    await test({ action: 'send-sms', u, p, d, m, s: 'UCC', type: '1' });

    console.log('\n--- Testing Number Format ---');
    await test({ action: 'send-sms', u, p, d: '0505930906', m, s: 'UCC' });

    process.exit();
}
run();
