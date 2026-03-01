const axios = require('axios');
const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const { decrypt } = require('../utils/encryption');

const getSettingsByCategory = async (category) => {
    const { rows } = await query('SELECT `key`, `value` FROM settings WHERE category = ?', [category]);
    const settings = {};
    const sensitiveKeys = ['sms_api_key', 'email_pass', 'email_api_key', 'paystack_secret_key'];

    rows.forEach(s => {
        settings[s.key] = sensitiveKeys.includes(s.key) ? decrypt(s.value) : s.value;
    });
    return settings;
};

exports.sendSMS = async (phoneNumber, message) => {
    try {
        const settings = await getSettingsByCategory('comm_sms');
        const { sms_provider = 'arkesel', sms_api_key, sms_sender_id } = settings;

        if (!sms_api_key) return false;

        const formattedPhone = phoneNumber.replace(/[^0-9]/g, '').replace(/^0/, '233');
        const finalPhone = formattedPhone.startsWith('233') ? formattedPhone : '233' + formattedPhone;

        const params = {
            action: 'send-sms',
            api_key: sms_api_key,
            to: finalPhone,
            from: sms_sender_id || 'UCC Dues',
            sms: message
        };

        const res = await axios.get('https://sms.arkesel.com/sms/api', { params });
        return res.data.code === 'ok' || res.status === 200;
    } catch (error) {
        console.error('SMS error:', error.message);
        return false;
    }
};

exports.sendEmail = async (to, subject, text, html, attachments = []) => {
    try {
        const settings = await getSettingsByCategory('comm_email');
        const { email_host, email_port, email_user, email_pass, email_from, email_from_name } = settings;

        if (!email_host || !email_user || !email_pass) return false;

        const transporter = nodemailer.createTransport({
            host: email_host,
            port: parseInt(email_port) || 587,
            secure: parseInt(email_port) === 465,
            auth: { user: email_user, pass: email_pass }
        });

        const info = await transporter.sendMail({
            from: `"${email_from_name || 'UCC Dues'}" <${email_from || email_user}>`,
            to,
            subject,
            text,
            html,
            attachments
        });

        return !!info.messageId;
    } catch (error) {
        console.error('Email error:', error.message);
        return false;
    }
};
