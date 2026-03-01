const axios = require('axios');

async function test(params) {
    try {
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', { params, timeout: 5000 });
        console.log(`PARAMS: ${JSON.stringify(params)} -> DATA: ${JSON.stringify(res.data)}`);
    } catch (e) {
        // ignore
    }
}

async function run() {
    const u = 'SWIFTPIA';
    const p = '2025';
    const to = '233505930906';
    const msg = 'Test msg';

    // Ozeki style
    await test({ action: 'SendMessage', username: u, password: p, recipient: to, messagedata: msg });

    // Another common style
    await test({ action: 'send', user: u, password: p, to: to, text: msg });

    // Try with action=send-sms and different recipient/msg params
    await test({ action: 'send-sms', u, p, to, msg });
    await test({ action: 'send-sms', u, p, d: to, m: msg });

    process.exit();
}
run();
