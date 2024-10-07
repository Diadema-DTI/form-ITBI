const crypto = require('crypto');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        // Store the private key securely (e.g., in environment variables)
        process.env.PRIVATE_KEY = privateKey;

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ publicKeyPem: publicKey })
        };
    } catch (error) {
        console.error('Error generating key pair:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to generate key pair' })
        };
    }
};
