const axios = require('axios');

async function test(paramName) {
    try {
        const key = 'SWIFTPIA2025';
        const params = { action: 'send-sms', to: '233505930906', sms: 'Test', from: 'UCC' };
        params[paramName] = key;
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', { params, timeout: 5000 });
        console.log(`[${paramName}]:`, res.data);
    } catch (e) {
        console.log(`[${paramName}] Error:`, e.message);
    }
}

async function run() {
    const list = ['key', 'api_key', 'apikey', 'auth_key', 'authkey', 'token', 'access_token', 'sn_key', 'u', 'user', 'username', 'h'];
    for (const p of list) {
        await test(p);
    }
    process.exit();
}
run();
