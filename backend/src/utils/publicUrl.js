const isUnsafeHost = (url = '') => {
  const value = String(url || '').toLowerCase();
  return value.includes('vercel.app') || value.includes('railway.app') || value.includes('localhost') || value.includes('127.0.0.1');
};

const cleanBase = (url = '') => String(url || '').replace(/\/$/, '');

const getPublicAppUrl = () => {
  const candidates = [
    process.env.PUBLIC_APP_URL,
    process.env.CUSTOM_DOMAIN,
    process.env.APP_URL,
    process.env.BASE_URL,
    process.env.FRONTEND_URL
  ].filter(Boolean);

  const safe = candidates.find((url) => !isUnsafeHost(url));
  return cleanBase(safe || candidates[0] || '');
};

const buildPublicPath = (path = '/') => {
  const base = getPublicAppUrl();
  const cleanPath = String(path || '/').startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
};

const buildReceiptVerifyUrl = (receiptNumber = '') => buildPublicPath(`/verify-receipt?receipt=${encodeURIComponent(receiptNumber)}`);
const buildPortalUrl = () => buildPublicPath('/login');

module.exports = {
  getPublicAppUrl,
  buildPublicPath,
  buildReceiptVerifyUrl,
  buildPortalUrl,
  isUnsafeHost
};
