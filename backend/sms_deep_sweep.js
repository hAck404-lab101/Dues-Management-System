const axios = require('axios');

async function test(params) {
    try {
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', { params, timeout: 5000 });
        if (res.data.code !== '102' && res.data.message !== 'Bad gateway requested') {
            console.log(`SUCCESS?`, params, res.data);
        } else {
            console.log(`FAIL [${res.data.code}] ${res.data.message}:`, params.action || 'no action', Object.keys(params).filter(k => !['u', 'p', 'd', 'm', 's', 'action'].includes(k)));
        }
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

    const actions = ['send-sms', 'sendsms', 'send_sms', 'sendmessage', 'SendMessage', 'send'];
    const toParams = ['to', 'd', 'dest', 'recipient'];
    const msgParams = ['msg', 'm', 'message', 'text'];
    const fromParams = ['from', 's', 'sender', 'senderid'];

    for (const action of actions) {
        for (const to of toParams) {
            for (const msg of msgParams) {
                for (const from of fromParams) {
                    const params = { u, p };
                    params['action'] = action;
                    params[to] = d;
                    params[msg] = m;
                    params[from] = s;
                    await test(params);
                }
            }
        }
    }
    process.exit();
}
run();
