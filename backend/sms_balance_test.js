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
    const actions = [
        'check-balance', 'checkbalance', 'getbalance', 'get_balance', 'balance',
        'account', 'profile', 'credits', 'user_info', 'userinfo',
        'get-credits', 'getcredits', 'view-balance'
    ];
    for (const a of actions) {
        await test(a);
    }
    process.exit();
}
run();
