const axios = require('axios');
const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const { decrypt } = require('../utils/encryption');

const getSettingsByCategories = async (categories) => {
    const placeholders = categories.map(() => '?').join(',');
    const { rows } = await query(`SELECT \`key\`, \`value\` FROM settings WHERE category IN (${placeholders})`, categories);
    const settings = {};
    const sensitiveKeys = ['sms_api_key', 'email_pass', 'email_api_key', 'paystack_secret_key'];

    rows.forEach(s => {
        settings[s.key] = sensitiveKeys.includes(s.key) ? decrypt(s.value) : s.value;
    });
    return settings;
};

const getSettingsByCategory = async (category) => {
    const fallbackMap = {
        comm_sms: ['comm_sms', 'notifications'],
        notifications: ['notifications', 'comm_sms'],
        comm_email: ['comm_email', 'email'],
        email: ['email', 'comm_email']
    };

    return getSettingsByCategories(fallbackMap[category] || [category]);
};

const formatGhanaPhone = (phoneNumber) => {
    const raw = String(phoneNumber || '').replace(/[^0-9]/g, '');
    if (!raw) return '';
    if (raw.startsWith('233')) return raw;
    if (raw.startsWith('0')) return `233${raw.slice(1)}`;
    return `233${raw}`;
};

const sendArkeselSMS = async ({ apiKey, senderId, phone, message }) => {
    const params = {
        action: 'send-sms',
        api_key: apiKey,
        to: phone,
        from: senderId || 'HTU Dues',
        sms: message
    };

    const res = await axios.get('https://sms.arkesel.com/sms/api', { params, timeout: 20000 });
    return res.data?.code === 'ok' || res.status === 200;
};

const sendGOnlineSitesSMS = async ({ apiKey, senderId, phone, message, apiUrl }) => {
    const endpoint = apiUrl || 'https://sms.gonlinesites.com/app/smsapi/index.php';

    const attempts = [
        {
            method: 'get',
            params: {
                key: apiKey,
                type: 'text',
                contacts: phone,
                senderid: senderId || 'HTU DUES',
                msg: message
            }
        },
        {
            method: 'get',
            params: {
                api_key: apiKey,
                to: phone,
                from: senderId || 'HTU DUES',
                message
            }
        },
        {
            method: 'post',
            data: {
                key: apiKey,
                type: 'text',
                contacts: phone,
                senderid: senderId || 'HTU DUES',
                msg: message
            }
        }
    ];

    let lastResponse = null;
    for (const attempt of attempts) {
        try {
            const res = await axios({
                url: endpoint,
                method: attempt.method,
                params: attempt.params,
                data: attempt.data,
                timeout: 20000
            });

            lastResponse = res.data;
            const text = typeof res.data === 'string' ? res.data.toLowerCase() : JSON.stringify(res.data || {}).toLowerCase();

            if (
                res.status >= 200 && res.status < 300 &&
                !text.includes('invalid') &&
                !text.includes('error') &&
                !text.includes('failed') &&
                !text.includes('insufficient')
            ) {
                return true;
            }
        } catch (error) {
            lastResponse = error.response?.data || error.message;
        }
    }

    console.error('GOnlineSites SMS failed. Last provider response:', lastResponse);
    return false;
};

exports.sendSMS = async (phoneNumber, message) => {
    try {
        if (!phoneNumber || !message) return false;

        const settings = await getSettingsByCategory('comm_sms');
        const sms_provider = (settings.sms_provider || process.env.SMS_PROVIDER || 'arkesel').toLowerCase();
        const sms_api_key = settings.sms_api_key || process.env.SMS_API_KEY;
        const sms_sender_id = settings.sms_sender_id || process.env.SMS_SENDER_ID || 'HTU DUES';
        const sms_api_url = settings.sms_api_url || process.env.SMS_API_URL;

        if (!sms_api_key) {
            console.warn('SMS not sent: missing sms_api_key setting or SMS_API_KEY env variable');
            return false;
        }

        const finalPhone = formatGhanaPhone(phoneNumber);
        if (!finalPhone) return false;

        if (['gonlinesites', 'gonline', 'g-online-sites', 'sms.gonlinesites.com'].includes(sms_provider)) {
            return await sendGOnlineSitesSMS({
                apiKey: sms_api_key,
                senderId: sms_sender_id,
                phone: finalPhone,
                message,
                apiUrl: sms_api_url
            });
        }

        return await sendArkeselSMS({
            apiKey: sms_api_key,
            senderId: sms_sender_id,
            phone: finalPhone,
            message
        });
    } catch (error) {
        console.error('SMS error:', error.response?.data || error.message);
        return false;
    }
};

exports.sendEmail = async (to, subject, text, html, attachments = []) => {
    try {
        if (!to || !subject) return false;

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
            from: `"${email_from_name || 'HTU Dues'}" <${email_from || email_user}>`,
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
