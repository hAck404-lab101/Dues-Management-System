const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../config/database');
const { decrypt } = require('../utils/encryption');

const getPaystackKey = async () => {
  const { rows } = await query('SELECT value FROM settings WHERE `key` = "paystack_secret_key"');
  if (rows.length > 0 && rows[0].value) {
    return decrypt(rows[0].value);
  }
  return process.env.PAYSTACK_SECRET_KEY;
};

const getPaystackAxios = async () => {
  const secretKey = await getPaystackKey();
  return axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });
};

// Initialize transaction
exports.initializeTransaction = async (email, amount, reference, metadata = {}) => {
  try {
    const amountInKobo = Math.round(amount * 100);
    const paystackAxios = await getPaystackAxios();

    const response = await paystackAxios.post('/transaction/initialize', {
      email,
      amount: amountInKobo,
      reference,
      currency: 'GHS',
      metadata,
      callback_url: `${process.env.BASE_URL || 'http://localhost:3000'}/payment/callback`
    });

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack initialize error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Verify transaction
exports.verifyTransaction = async (reference) => {
  try {
    const paystackAxios = await getPaystackAxios();
    const response = await paystackAxios.get(`/transaction/verify/${reference}`);

    if (response.data.status && response.data.data.status === 'success') {
      return {
        success: true,
        data: response.data.data
      };
    }

    return {
      success: false,
      error: 'Transaction not successful'
    };
  } catch (error) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Get transaction
exports.getTransaction = async (id) => {
  try {
    const paystackAxios = await getPaystackAxios();
    const response = await paystackAxios.get(`/transaction/${id}`);
    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    console.error('Paystack get transaction error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Verify webhook signature synchronously so callers cannot accidentally accept a pending Promise.
// Set PAYSTACK_WEBHOOK_SECRET in production. If unavailable, PAYSTACK_SECRET_KEY is used as fallback.
exports.verifyWebhookSignature = (payload, signature) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '';

  if (!secret || !signature) return false;

  const body = Buffer.isBuffer(payload)
    ? payload.toString('utf8')
    : typeof payload === 'string'
      ? payload
      : JSON.stringify(payload);

  const hash = crypto
    .createHmac('sha512', secret)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
};
