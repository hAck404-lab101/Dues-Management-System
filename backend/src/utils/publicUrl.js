const DEFAULT_PUBLIC_APP_URL = 'https://uewdept.org';

const isUnsafeHost = (url = '') => {
  const value = String(url || '').toLowerCase();
  return (
    !value ||
    value.includes('vercel.app') ||
    value.includes('railway.app') ||
    value.includes('localhost') ||
    value.includes('127.0.0.1') ||
    value.includes('0.0.0.0')
  );
};

const cleanBase = (url = '') => String(url || '').replace(/\/$/, '');

const normalizeUrl = (url = '') => {
  const value = cleanBase(url);
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return `https://${value}`;
};

const getPublicAppUrl = () => {
  const candidates = [
    process.env.PUBLIC_APP_URL,
    process.env.CUSTOM_DOMAIN,
    process.env.APP_URL,
    process.env.BASE_URL,
    process.env.FRONTEND_URL,
  ].filter(Boolean).map(normalizeUrl);

  const safe = candidates.find((url) => !isUnsafeHost(url));
  return cleanBase(safe || DEFAULT_PUBLIC_APP_URL);
};

const buildPublicPath = (path = '/') => {
  const base = getPublicAppUrl();
  const cleanPath = String(path || '/').startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

const buildReceiptVerifyUrl = (receiptNumber = '') => buildPublicPath(`/verify-receipt?receipt=${encodeURIComponent(receiptNumber)}`);
const buildPortalUrl = () => buildPublicPath('/login');

const enforcePublicUrlInText = (text = '') => {
  const publicUrl = getPublicAppUrl();
  return String(text || '')
    .replace(/https?:\/\/[^\s]+\.vercel\.app/gi, publicUrl)
    .replace(/https?:\/\/[^\s]+\.railway\.app/gi, publicUrl)
    .replace(/http:\/\/localhost:\d+/gi, publicUrl)
    .replace(/http:\/\/127\.0\.0\.1:\d+/gi, publicUrl);
};

module.exports = {
  getPublicAppUrl,
  buildPublicPath,
  buildReceiptVerifyUrl,
  buildPortalUrl,
  isUnsafeHost,
  enforcePublicUrlInText,
  DEFAULT_PUBLIC_APP_URL
};
