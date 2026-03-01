const axios = require('axios');

async function test(params) {
    try {
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', { params, timeout: 5000 });
        console.log(`CODE[${res.data.code}] MSG[${res.data.message}] PARAMS:`, JSON.stringify(params));
    } catch (e) {
        // ignore
    }
}

async function run() {
    const u = 'SWIFTPIA';
    const p = '2025';
    const d = '233505930906';
    const m = 'Test msg';
    const s = 'UCC';

    // Based on previous tests, u=SWIFTPIA, p=2025 moves past auth error 102.

    const actions = ['send-sms', 'sendsms', 'send_sms', 'sendmessage', 'SendMessage', 'send', 'bulk-sms', 'bulksms'];

    for (const action of actions) {
        await test({ u, p, action, d, m, s, gateway: '1' });
        await test({ u, p, action, to: d, msg: m, from: s, gateway: '1' });
        await test({ u, p, action, dest: d, text: m, sender: s, gateway: '1' });
    }
    process.exit();
}
run();
