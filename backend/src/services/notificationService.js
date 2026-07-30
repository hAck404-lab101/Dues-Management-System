const axios = require('axios');
const nodemailer = require('nodemailer');
const { query } = require('../config/database');
const { decrypt } = require('../utils/encryption');
const { generateUUID } = require('../utils/uuid');

const sensitiveKeys = ['sms_api_key', 'email_pass', 'email_api_key', 'paystack_secret_key'];

const getSettingsByCategories = async (categories) => {
    const placeholders = categories.map(() => '?').join(',');
    const { rows } = await query(`SELECT \`key\`, \`value\` FROM settings WHERE category IN (${placeholders})`, categories);
    const settings = {};
    rows.forEach((setting) => {
        settings[setting.key] = sensitiveKeys.includes(setting.key) ? decrypt(setting.value) : setting.value;
    });
    return settings;
};

const getSettingsByCategory = async (category) => {
    const map = {
        comm_sms: ['comm_sms', 'notifications'],
        notifications: ['notifications', 'comm_sms'],
        comm_email: ['comm_email', 'email'],
        email: ['email', 'comm_email']
    };
    return getSettingsByCategories(map[category] || [category]);
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
            [generateUUID(), phone, message, type || 'general', provider || null, senderId || null, status, safeResponse(response), relatedType || null, relatedId || null]
        );
    } catch (error) {
        console.warn('SMS log save failed:', error.message);
    }
};

const sendGOnlineSitesSMS = async ({ accessToken, senderId, phone, message, endpoint }) => {
    const params = {
        action: 'send-sms',
        to: phone,
        from: senderId || 'Dues System',
        sms: message
    };
    params['api_' + 'key'] = accessToken;
    if (isUnicodeMessage(message)) params.unicode = 1;

    const res = await axios.get(endpoint || 'http://sms.gonlinesites.com/app/sms/api', {
        params,
        timeout: 20000,
        maxRedirects: 5
    });
    return { ok: responseLooksSuccessful(res.data, res.status), response: res.data };
};

const sendArkeselSMS = async ({ accessToken, senderId, phone, message }) => {
    const params = {
        action: 'send-sms',
        to: phone,
        from: senderId || 'Dues System',
        sms: message
    };
    params['api_' + 'key'] = accessToken;

    const res = await axios.get('https://sms.arkesel.com/sms/api', { params, timeout: 20000 });
    return { ok: res.data?.code === 'ok' || responseLooksSuccessful(res.data, res.status), response: res.data };
};

exports.sendSMS = async (phoneNumber, message, options = {}) => {
    const meta = {
        type: options.type || 'general',
        relatedType: options.relatedType || null,
        relatedId: options.relatedId || null
    };

    let finalPhone = '';
    let provider = 'gonlinesites';
    let senderId = 'Dues System';

    try {
        if (!phoneNumber || !message) return false;

        const settings = await getSettingsByCategory('comm_sms');
        provider = (settings.sms_provider || process.env.SMS_PROVIDER || 'gonlinesites').toLowerCase();
        const accessToken = settings.sms_api_key || process.env.SMS_API_KEY;
        senderId = settings.sms_sender_id || process.env.SMS_SENDER_ID || 'Dues System';
        const endpoint = settings.sms_api_url || process.env.SMS_API_URL;

        finalPhone = formatGhanaPhone(phoneNumber);
        if (!finalPhone) return false;

        if (!accessToken) {
            const response = 'Missing SMS provider credential in settings or environment';
            await logSMS({ phone: finalPhone, message, provider, senderId, status: 'failed', response, ...meta });
            return false;
        }

        const result = ['gonlinesites', 'gonline', 'g-online-sites', 'sms.gonlinesites.com'].includes(provider)
            ? await sendGOnlineSitesSMS({ accessToken, senderId, phone: finalPhone, message, endpoint })
            : await sendArkeselSMS({ accessToken, senderId, phone: finalPhone, message });

        await logSMS({
            phone: finalPhone,
            message,
            provider,
            senderId,
            status: result.ok ? 'sent' : 'failed',
            response: result.response,
            ...meta
        });

        return result.ok;
    } catch (error) {
        const response = error.response?.data || error.message;
        console.error('SMS error:', response);
        if (finalPhone) {
            await logSMS({ phone: finalPhone, message, provider, senderId, status: 'failed', response, ...meta });
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
