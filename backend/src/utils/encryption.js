const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
const key = crypto.scryptSync(process.env.JWT_SECRET || 'your-default-secret-key', 'salt', 32);
const iv = Buffer.alloc(16, 0); // In a real production app, you should use a unique IV per encryption and store it alongside the ciphertext.

/**
 * Encrypt a string
 * @param {string} text 
 * @returns {string} 
 */
function encrypt(text) {
    if (!text) return text;
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
}

/**
 * Decrypt a string
 * @param {string} encryptedText 
 * @returns {string} 
 */
function decrypt(encryptedText) {
    if (!encryptedText) return encryptedText;
    try {
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        // If decryption fails, it might not be encrypted (migration phase)
        return encryptedText;
    }
}

module.exports = {
    encrypt,
    decrypt
};
