const axios = require('axios');

async function testEndpoint(name, url, params, headers = {}) {
    try {
        console.log(`\n--- Testing ${name} ---`);
        console.log(`URL: ${url}`);
        const res = await axios.get(url, { params, headers, timeout: 5000 });
        console.log(`Response:`, res.data);
    } catch (e) {
        console.log(`Error:`, e.message);
        if (e.response) console.log(`Response Data:`, e.response.data);
    }
}

async function runTests() {
    const key = 'SWIFTPIA2025';
    const to = '233505930906';
    const msg = 'Test message';
    const sender = 'DiM Project';

    // Test 1: GOnlineSites original with api_key
    await testEndpoint('GOnlineSites Original (api_key)', 'http://sms.gonlinesites.com/app/sms/api', {
        action: 'send-sms',
        api_key: key,
        to,
        from: sender,
        sms: msg
    });

    // Test 2: GOnlineSites original with key
    await testEndpoint('GOnlineSites Original (key)', 'http://sms.gonlinesites.com/app/sms/api', {
        action: 'send-sms',
        key: key,
        to,
        from: sender,
        msg: msg
    });

    // Test 3: GOnlineSites with apikey (no underscore)
    await testEndpoint('GOnlineSites Original (apikey)', 'http://sms.gonlinesites.com/app/sms/api', {
        action: 'send-sms',
        apikey: key,
        to,
        from: sender,
        msg: msg
    });

    // Test 4: Arkesel Endpoint (Case: User bought Arkesel but put it under GOnlineSites)
    await testEndpoint('Arkesel Endpoint', 'https://sms.arkesel.com/sms/api', {
        action: 'send-sms',
        api_key: key,
        to,
        from: sender,
        sms: msg
    });

    // Test 5: Arkesel V2 Header
    await testEndpoint('Arkesel V2 Header', 'https://sms.arkesel.com/api/v2/sms/send', {}, {
        'api-key': key
    });

    process.exit();
}

runTests();
