// File: functions/submit-form.js

const nodemailer = require('nodemailer');
const moment = require('moment-timezone');

// Remove or comment out any crypto-related imports if present

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Parse the incoming data
    const jsonData = JSON.parse(event.body);
    
    // Remove or comment out any decryption logic
    // const decryptedData = ... (remove this if present)

    // Generate protocol number
    const protocolNumber = generateProtocolNumber();

    // Get email recipients
    const recipients = await getRecipients();

    // Set up email transporter
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
      to: [...recipients, process.env.RECIPIENT_EMAILS.split(','), jsonData.emailRequerente].join(','),
      subject: `[Protocolo: ${protocolNumber}] Nova submissão de ITBI`,
      text: `
        Número de Protocolo: ${protocolNumber}

        Dados do Requerente:
        Nome: ${jsonData.nomeRequerente}
        CPF/CNPJ: ${jsonData.cpfRequerente || jsonData.cnpjRequerente}
        Telefone: ${jsonData.telefoneRequerente}
        Email: ${jsonData.emailRequerente}

        Método de Submissão: ${jsonData.metodoSubmissao}

        ${jsonData.metodoSubmissao === 'formulario' ? `
        Dados da Transação:
        Tipo de Transação: ${jsonData.tipoTransacao}
        Valor Total: R$ ${jsonData.valorTotal}
        Valor Financiado: R$ ${jsonData.valorFinanciado}
        Valor à Vista: R$ ${jsonData.valorAVista}
        Data da Transmissão: ${jsonData.dataTransmissao}

        Dados do Imóvel:
        Inscrição Imobiliária: ${jsonData.inscricaoImobiliaria}
        Matrícula: ${jsonData.matriculaImovel}
        Endereço: ${jsonData.logradouroImovel}, ${jsonData.numeroImovel}
        Complemento: ${jsonData.complementoImovel}
        Bairro: ${jsonData.bairroImovel}
        Cidade: ${jsonData.cidadeImovel}
        Estado: ${jsonData.estadoImovel}
        CEP: ${jsonData.cepImovel}

        Dados do Adquirente:
        Nome: ${jsonData.nomeAdquirente}
        CPF/CNPJ: ${jsonData.cpfAdquirente || jsonData.cnpjAdquirente}
        Email: ${jsonData.emailAdquirente}
        Telefone: ${jsonData.telefoneAdquirente}

        Dados do Transmitente:
        Nome: ${jsonData.nomeTransmitente}
        CPF/CNPJ: ${jsonData.cpfTransmitente || jsonData.cnpjTransmitente}
        Email: ${jsonData.emailTransmitente}
        Telefone: ${jsonData.telefoneTransmitente}
        ` : 'Dados constam dos documentos anexados'}

        IP do Remetente: ${jsonData.ipAddress}
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Formulário enviado com sucesso' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Falha ao processar submissão do formulário' }),
    };
  }
};

// Helper functions (keep these as they are)
function generateProtocolNumber() {
  const now = moment().tz('America/Sao_Paulo');
  const formattedDate = now.format('YYYY.MM.DD.HH.mm');
  const sequentialNumber = (parseInt(process.env.LAST_PROTOCOL) || 0) + 1;
  process.env.LAST_PROTOCOL = sequentialNumber.toString();
  return `${formattedDate}.${sequentialNumber.toString().padStart(6, '0')}`;
}

async function getRecipients() {
  // Implement your logic to get recipients based on the current date and time
  // This function should return an array of email addresses
}
