const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { formData, fileData, fileName } = JSON.parse(event.body);

    // Decrypt data using the stored private key
    const privateKey = crypto.createPrivateKey(process.env.PRIVATE_KEY);

    const decryptedFormData = JSON.parse(
      crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(formData)
      ).toString()
    );

    const decryptedFileData = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(fileData)
    );

    // Set up email transporter (using Gmail in this example)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Prepare email content
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECIPIENT_EMAILS,
      subject: 'Nova Submissão de Formulário',
      text: `
        Nome: ${decryptedFormData.name}
        Email: ${decryptedFormData.email}
        CPF: ${decryptedFormData.cpf}
        Telefone: ${decryptedFormData.phone}
        Mensagem: ${decryptedFormData.message}
        Consentimento dado: ${decryptedFormData.consent ? 'Sim' : 'Não'}
      `,
      attachments: [
        {
          filename: fileName,
          content: decryptedFileData
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Formulário enviado com sucesso' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Falha ao processar submissão do formulário' }) };
  }
};
