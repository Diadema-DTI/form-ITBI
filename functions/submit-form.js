const { JWT } = require('google-auth-library');
const { google } = require('googleapis');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { encryptedData } = JSON.parse(event.body);

        // Decrypt the data using the stored private key
        const privateKey = process.env.PRIVATE_KEY;
        const decryptedData = crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            Buffer.from(encryptedData)
        );

        const formData = JSON.parse(decryptedData.toString());

        // Set up Google Cloud authentication
        const client = new JWT({
            email: process.env.GOOGLE_CLIENT_EMAIL,
            key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            scopes: ['https://www.googleapis.com/auth/gmail.send'],
        });

        const gmail = google.gmail({ version: 'v1', auth: client });

        // Prepare email content
        const emailContent = `
            Novo formulário ITBI recebido:
            Nome: ${formData.nomeRequerente}
            CPF: ${formData.cpfRequerente}
            Email: ${formData.emailRequerente}
            Método de Submissão: ${formData.metodoSubmissao}
        `;

        // Send email using Gmail API
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: Buffer.from(
                    `To: ${process.env.RECIPIENT_EMAILS}\r\n` +
                    `Subject: Novo Formulário ITBI\r\n\r\n` +
                    emailContent
                ).toString('base64')
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Form submitted successfully' }),
        };
    } catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to process form submission' }),
        };
    }
};
