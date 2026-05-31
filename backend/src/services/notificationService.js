<<<<<<< HEAD
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

        // Resolve app name for default sender ID
        const { rows: nameRows } = await query('SELECT value FROM settings WHERE `key` = "app_name" LIMIT 1');
        const appName = (nameRows[0]?.value || 'Dues Portal').substring(0, 11); // Arkesel max 11 chars

        const formattedPhone = phoneNumber.replace(/[^0-9]/g, '').replace(/^0/, '233');
        const finalPhone = formattedPhone.startsWith('233') ? formattedPhone : '233' + formattedPhone;

        const params = {
            action: 'send-sms',
            api_key: sms_api_key,
            to: finalPhone,
            from: sms_sender_id || appName,
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

        // Resolve app name for default display name
        const { rows: nameRows } = await query('SELECT value FROM settings WHERE `key` = "app_name" LIMIT 1');
        const appName = nameRows[0]?.value || 'Dues Portal';

        const transporter = nodemailer.createTransport({
            host: email_host,
            port: parseInt(email_port) || 587,
            secure: parseInt(email_port) === 465,
            auth: { user: email_user, pass: email_pass }
        });

        const info = await transporter.sendMail({
            from: `"${email_from_name || appName}" <${email_from || email_user}>`,
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
=======
const axios = require('axios');
const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const { decrypt } = require('../utils/encryption');
const { generateUUID } = require('../utils/uuid');

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

const isUnicodeMessage = (message) => /[^\x00-\x7F]/.test(String(message || ''));

const responseLooksSuccessful = (data, status) => {
    const text = typeof data === 'string' ? data.toLowerCase() : JSON.stringify(data || {}).toLowerCase();
    return status >= 200 && status < 300 &&
        !text.includes('invalid') &&
        !text.includes('error') &&
        !text.includes('failed') &&
        !text.includes('insufficient') &&
        !text.includes('unauthorized') &&
        !text.includes('denied');
};

const safeResponse = (value) => {
    try {
        const text = typeof value === 'string' ? value : JSON.stringify(value || {});
        return text.length > 3000 ? text.slice(0, 3000) : text;
    } catch (_) {
        return String(value || '');
    }
};

const logSMS = async ({ phone, message, type, provider, senderId, status, response, relatedType, relatedId }) => {
    try {
        await query(
            `INSERT INTO sms_logs (id, recipient_phone, message, message_type, provider, sender_id, status, provider_response, related_type, related_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                generateUUID(),
                phone,
                message,
                type || 'general',
                provider || null,
                senderId || null,
                status,
                safeResponse(response),
                relatedType || null,
                relatedId || null
            ]
        );
    } catch (error) {
        console.warn('SMS log save failed:', error.message);
    }
};

const sendArkeselSMS = async ({ apiKey, senderId, phone, message }) => {
    const params = {
        action: 'send-sms',
        api_key: apiKey,
        to: phone,
        from: senderId || 'UEW Dues',
        sms: message
    };

    const res = await axios.get('https://sms.arkesel.com/sms/api', { params, timeout: 20000 });
    return { ok: res.data?.code === 'ok' || responseLooksSuccessful(res.data, res.status), response: res.data };
};

const sendGOnlineSitesSMS = async ({ apiKey, senderId, phone, message, apiUrl }) => {
    const endpoint = apiUrl || 'http://sms.gonlinesites.com/app/sms/api';
    const params = {
        action: 'send-sms',
        api_key: apiKey,
        to: phone,
        from: senderId || 'UEW Dues',
        sms: message
    };

    if (isUnicodeMessage(message)) {
        params.unicode = 1;
    }

    const res = await axios.get(endpoint, {
        params,
        timeout: 20000,
        maxRedirects: 5
    });

    const ok = responseLooksSuccessful(res.data, res.status);
    if (!ok) {
        console.error('GOnlineSites SMS failed. Provider response:', res.data);
    }

    return { ok, response: res.data };
};

exports.sendSMS = async (phoneNumber, message, options = {}) => {
    const meta = {
        type: options.type || 'general',
        relatedType: options.relatedType || null,
        relatedId: options.relatedId || null
    };

    let finalPhone = '';
    let sms_provider = 'gonlinesites';
    let sms_sender_id = 'UEW Dues';

    try {
        if (!phoneNumber || !message) return false;

        const settings = await getSettingsByCategory('comm_sms');
        sms_provider = (settings.sms_provider || process.env.SMS_PROVIDER || 'gonlinesites').toLowerCase();
        const sms_api_key = settings.sms_api_key || process.env.SMS_API_KEY;
        sms_sender_id = settings.sms_sender_id || process.env.SMS_SENDER_ID || 'UEW Dues';
        const sms_api_url = settings.sms_api_url || process.env.SMS_API_URL;

        finalPhone = formatGhanaPhone(phoneNumber);
        if (!finalPhone) return false;

        if (!sms_api_key) {
            const response = 'Missing sms_api_key setting or SMS_API_KEY env variable';
            console.warn(`SMS not sent: ${response}`);
            await logSMS({ phone: finalPhone, message, provider: sms_provider, senderId: sms_sender_id, status: 'failed', response, ...meta });
            return false;
        }

        let result;
        if (['gonlinesites', 'gonline', 'g-online-sites', 'sms.gonlinesites.com'].includes(sms_provider)) {
            result = await sendGOnlineSitesSMS({
                apiKey: sms_api_key,
                senderId: sms_sender_id,
                phone: finalPhone,
                message,
                apiUrl: sms_api_url
            });
        } else {
            result = await sendArkeselSMS({
                apiKey: sms_api_key,
                senderId: sms_sender_id,
                phone: finalPhone,
                message
            });
        }

        await logSMS({
            phone: finalPhone,
            message,
            provider: sms_provider,
            senderId: sms_sender_id,
            status: result.ok ? 'sent' : 'failed',
            response: result.response,
            ...meta
        });

        return result.ok;
    } catch (error) {
        const response = error.response?.data || error.message;
        console.error('SMS error:', response);
        if (finalPhone) {
            await logSMS({ phone: finalPhone, message, provider: sms_provider, senderId: sms_sender_id, status: 'failed', response, ...meta });
        }
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
            from: `"${email_from_name || 'Dues Management'}" <${email_from || email_user}>`,
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
>>>>>>> 27716d86217526bcba288e356ca18fe65b35b5aa
