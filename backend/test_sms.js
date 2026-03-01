const { sendSMS } = require('./src/services/notificationService');
require('dotenv').config();

async function test() {
    try {
        console.log('Testing SMS send...');
        // Using a dummy number (or user's number from logs if I want to be real, but let's avoid spamming)
        // I saw 233505930906 in logs.
        const result = await sendSMS('233505930906', 'This is a test message from the system upgrade.');
        console.log('Final Result:', result);
    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        process.exit();
    }
}
test();
