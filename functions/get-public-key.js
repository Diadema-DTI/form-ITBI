const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  // Store the private key securely (e.g., in environment variables)
  process.env.PRIVATE_KEY = privateKey.export({ type: 'pkcs1', format: 'pem' });

  return {
    statusCode: 200,
    body: JSON.stringify({ publicKey: publicKey.export({ type: 'spki', format: 'pem' }) }),
  };
};
