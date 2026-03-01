const axios = require('axios');

async function test(param) {
    try {
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', {
            params: {
                action: 'send-sms',
                [param]: 'SWIFTPIA2025',
                to: '233505930906',
                sms: 'Test',
                from: 'UCC'
            },
            timeout: 5000
        });
        if (res.data.code !== '102' && res.data.message !== 'Bad gateway requested') {
            console.log(`[${param}] SUCCESS:`, res.data);
        } else if (res.data.code === '102') {
            // Auth failed
        } else {
            // 100 Bad gateway
        }
    } catch (e) {
        // ignore
    }
}

async function run() {
    const list = [
        'api_key', 'apikey', 'key', 'authkey', 'auth_key', 'token', 'access_token',
        'api_id', 'apiid', 'appid', 'app_id', 'access_id', 'accessid',
        'uid', 'userid', 'user_id', 'u', 'username', 'user'
    ];
    for (const p of list) {
        await test(p);
    }
    process.exit();
}
run();
