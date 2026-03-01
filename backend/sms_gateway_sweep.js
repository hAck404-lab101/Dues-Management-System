const axios = require('axios');

async function test(name) {
    try {
        const params = {
            action: 'send-sms',
            u: 'SWIFTPIA',
            p: '2025',
            d: '233505930906',
            m: 'Test from system upgrade.',
            s: 'UCC'
        };
        params[name] = '1'; // Try value 1
        const res = await axios.get('http://sms.gonlinesites.com/app/sms/api', { params, timeout: 5000 });
        console.log(`[${name}=1]:`, res.data);
    } catch (e) {
        console.log(`[${name}] Error:`, e.message);
    }
}

async function run() {
    const list = ['gateway', 'route', 'channel', 'mode', 'type', 'g'];
    for (const p of list) {
        await test(p);
    }
    process.exit();
}
run();
