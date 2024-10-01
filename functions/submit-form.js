const crypto = require('crypto');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { formData } = JSON.parse(event.body);

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
      subject: 'Nova Submissão de ITBI e Cadastro de Contribuinte',
      text: `
        Dados do Imóvel:
        Inscrição Cadastral: ${decryptedFormData.inscricaoCadastral}
        Endereço: ${decryptedFormData.endereco}

        Dados da Transação:
        Tipo de Transação: ${decryptedFormData.tipoTransacao}
        Valor da Transação: R$ ${decryptedFormData.valorTransacao}

        Dados do Comprador:
        Nome: ${decryptedFormData.nomeComprador}
        CPF: ${decryptedFormData.cpfComprador}

        Dados do Vendedor:
        Nome: ${decryptedFormData.nomeVendedor}
        CPF: ${decryptedFormData.cpfVendedor}

        IP do Remetente: ${decryptedFormData.ipAddress}

        Consentimento dado: ${decryptedFormData.consent ? 'Sim' : 'Não'}
      `
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
