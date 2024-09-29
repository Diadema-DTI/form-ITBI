const crypto = require('crypto');

exports.handler = async () => {
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
