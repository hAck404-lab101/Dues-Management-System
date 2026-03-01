const { v4: uuidv4 } = require('uuid');

// Generate UUID for MySQL (CHAR(36) format)
const generateUUID = () => {
  return uuidv4();
};

module.exports = { generateUUID };

