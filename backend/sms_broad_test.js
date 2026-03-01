const axios = require('axios');

async function test(name, url, params) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        const res = await axios.get(url, { params, timeout: 5000 });
        console.log('Response:', res.data);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

async function run() {
    const key = 'SWIFTPIA2025';
    const to = '233505930906';
    const msg = 'Test message';
    const sender = 'DiM Project';

    // DreamWEB style
    await test('DreamWEB Style', 'http://sms.gonlinesites.com/app/sms/api', {
        u: key, // Using key as user
        p: '',
        m: msg,
        d: to,
        s: sender
    });

    // MSG91/Standard style
    await test('Standard Style', 'http://sms.gonlinesites.com/app/sms/api', {
        authkey: key,
        to,
        message: msg,
        sender: sender
    });

    // Hubtel Style
    await test('Hubtel Style', 'http://sms.gonlinesites.com/app/sms/api', {
        clientid: key,
        clientsecret: '',
        from: sender,
        to,
        content: msg
    });

    // Simplest
    await test('Simplest Style', 'http://sms.gonlinesites.com/app/sms/api', {
        key: key,
        to,
        msg: msg,
        sender: sender
    });

    process.exit();
}
run();
