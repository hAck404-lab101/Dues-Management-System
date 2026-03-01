const nodemailer = require('nodemailer');

async function testBrevo() {
    console.log('--- Testing Brevo SMTP Port 465 (SSL) ---');

    const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
            user: 'a300f8001@smtp-brevo.com',
            pass: 'A3bt4KdrDVnF6g2f'
        },
        timeout: 15000
    });

    try {
        console.log('Verifying connection on port 465...');
        const success = await transporter.verify();
        if (success) {
            console.log('✓ Connection verified successfully!');
        }
    } catch (error) {
        console.error('✗ Connection failed on 465:', error.message);
    } finally {
        process.exit();
    }
}

testBrevo();
