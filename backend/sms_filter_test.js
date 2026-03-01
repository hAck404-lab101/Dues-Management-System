const axios = require('axios');

async function test(name, url, params) {
    try {
        const res = await axios.get(url, { params, timeout: 5000 });
        if (res.data.code !== '102') {
            console.log(`[${name}] SUCCESS or DIFFERENT ERROR:`, res.data);
        } else {
            console.log(`[${name}] 102 - Auth Failed`);
        }
    } catch (e) {
        console.log(`[${name}] Fetch Error:`, e.message);
    }
}

async function run() {
    const key = 'SWIFTPIA2025';
    const to = '233505930906';
    const msg = 'Test message';
    const sender = 'DiM Project';

    await test('DreamWEB Style', 'http://sms.gonlinesites.com/app/sms/api', { u: key, p: '', m: msg, d: to, s: sender });
    await test('Standard Style', 'http://sms.gonlinesites.com/app/sms/api', { authkey: key, to, message: msg, sender: sender });
    await test('Hubtel Style', 'http://sms.gonlinesites.com/app/sms/api', { clientid: key, clientsecret: '', from: sender, to, content: msg });
    await test('Simplest Style', 'http://sms.gonlinesites.com/app/sms/api', { key: key, to, msg: msg, sender: sender });
    await test('Arkesel Style', 'http://sms.gonlinesites.com/app/sms/api', { action: 'send-sms', api_key: key, to, from: sender, sms: msg });

    process.exit();
}
run();
