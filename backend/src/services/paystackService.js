const axios = require('axios');
const crypto = require('crypto');
const { query } = require('../config/database');
const { decrypt } = require('../utils/encryption');
const { buildPublicPath, enforcePublicUrlInText } = require('../utils/publicUrl');

const decodeStoredSecret = (value) => {
  if (!value) return '';
  try {
    return decrypt(value);
  } catch (_) {
    // Legacy databases may contain a plaintext key. Do not make verification
    // impossible solely because the setting predates encrypted settings.
    return value;
  }
};

const getPaystackKey = async () => {
  const { rows } = await query('SELECT value FROM settings WHERE `key` = "paystack_secret_key" LIMIT 1');
  const stored = decodeStoredSecret(rows[0]?.value);
  const secretKey = stored || process.env.PAYSTACK_SECRET_KEY || '';

  if (!secretKey) {
    throw new Error('Paystack secret key is not configured');
  }

  return secretKey;
};

const getPaystackAxios = async () => {
  const secretKey = await getPaystackKey();
  return axios.create({
    baseURL: 'https://api.paystack.co',
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });
};

const getCallbackUrl = () => enforcePublicUrlInText(buildPublicPath('/payment/callback'));

exports.initializeTransaction = async (email, amount, reference, metadata = {}) => {
  try {
    const amountInSubunit = Math.round(Number(amount) * 100);
    const paystackAxios = await getPaystackAxios();
    const callbackUrl = getCallbackUrl();

    const response = await paystackAxios.post('/transaction/initialize', {
      email,
      amount: amountInSubunit,
      reference,
      currency: 'GHS',
      metadata: {
        ...metadata,
        callback_url: callbackUrl
      },
      callback_url: callbackUrl
    });

    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Paystack initialize error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// A Paystack verification request can be valid while the transaction itself is
// still pending/processing (particularly for MoMo). Return the transaction data
// whenever Paystack successfully answers so the reconciliation layer can decide
// whether to complete, retry, or leave the payment pending.
exports.verifyTransaction = async (reference) => {
  try {
    const paystackAxios = await getPaystackAxios();
    const response = await paystackAxios.get(`/transaction/verify/${encodeURIComponent(reference)}`);

    if (response.data?.status && response.data?.data) {
      return { success: true, data: response.data.data };
    }

    return {
      success: false,
      error: response.data?.message || 'Unable to verify transaction'
    };
  } catch (error) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

exports.getTransaction = async (id) => {
  try {
    const paystackAxios = await getPaystackAxios();
    const response = await paystackAxios.get(`/transaction/${id}`);
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Paystack get transaction error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Paystack signs webhooks with the integration SECRET KEY using HMAC SHA512.
// This must use the same secret key as transaction initialization/verification.
exports.verifyWebhookSignature = async (payload, signature) => {
  if (!signature) return false;
  const secret = await getPaystackKey();
  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const a = Buffer.from(hash, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

exports.listTransactions = async (params = {}) => {
  try {
    const paystackAxios = await getPaystackAxios();
    const response = await paystackAxios.get('/transaction', { params });
    return { success: true, data: response.data.data };
  } catch (error) {
    console.error('Paystack list transactions error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};
