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
    const to = '233505930906';
    const msg = 'Test message from UCC system.';

    console.log('--- Testing Minimal Params ---');
    await test({ action: 'send-sms', u, p, to, msg });

    console.log('\n--- Testing with different TO/MSG param names ---');
    await test({ action: 'send-sms', u, p, d: to, m: msg });
    await test({ action: 'send-sms', u, p, dest: to, text: msg });

    console.log('\n--- Testing with Sender ID ---');
    await test({ action: 'send-sms', u, p, to, msg, s: 'UCC' });
    await test({ action: 'send-sms', u, p, to, msg, from: 'UCC' });
    await test({ action: 'send-sms', u, p, to, msg, sender: 'UCC' });

    console.log('\n--- Testing Gateways ---');
    await test({ action: 'send-sms', u, p, to, msg, gateway: '0' });
    await test({ action: 'send-sms', u, p, to, msg, gateway: '1' });
    await test({ action: 'send-sms', u, p, to, msg, gateway: '2' });

    process.exit();
}
run();
