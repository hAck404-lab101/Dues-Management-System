const axios = require('axios');

async function test(action) {
    try {
        const u = 'SWIFTPIA';
        const p = '2025';
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
            params: { action, u, p },
            timeout: 5000
        });
        console.log(`ACTION[${action}] -> DATA:`, res.data);
    } catch (e) {
        // ignore
    }
}

async function run() {
    const actions = ['get-balance', 'balance', 'check-balance', 'account-info', 'credits', 'get_balance', 'GetBalance'];
    for (const action of actions) {
        await test(action);
    }
    process.exit();
}
run();
