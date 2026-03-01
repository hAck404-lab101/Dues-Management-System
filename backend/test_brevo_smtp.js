const nodemailer = require('nodemailer');

async function testBrevo() {
    console.log('--- Testing Brevo SMTP Connection ---');

    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // TLS
        auth: {
            user: 'a300f8001@smtp-brevo.com',
            pass: 'A3bt4KdrDVnF6g2f'
        },
        timeout: 10000 // 10 seconds timeout
    });

    try {
        console.log('Verifying connection...');
        const success = await transporter.verify();
        if (success) {
            console.log('✓ Connection verified successfully!');
        }
    } catch (error) {
        console.error('✗ Connection failed:');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit();
    }
}

testBrevo();
