// File: functions/submit-form.js

const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment-timezone');
const nodemailer = require('nodemailer');

const GOOGLE_SPREADSHEET_ID = '1WrHqsqQZ1CM8nsF_SfQUEEwtwhz-ZOzx';

const generateProtocolNumber = async () => {
  let lastProtocol = parseInt(process.env.LAST_PROTOCOL || '0');
  const newProtocol = lastProtocol + 1;
  
  // Update the environment variable
  process.env.LAST_PROTOCOL = newProtocol.toString();

  // Generate the formatted protocol number
  const now = moment().tz('America/Sao_Paulo');
  const formattedProtocol = `${now.format('YYYY.MM.DD.HH.mm')}.${newProtocol.toString().padStart(6, '0')}`;
  
  return formattedProtocol;
};

const getRecipients = async () => {
  const doc = new GoogleSpreadsheet(GOOGLE_SPREADSHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });
  await doc.loadInfo();

  const workShiftSheet = doc.sheetsByTitle['Plantonistas'];
  const userContactSheet = doc.sheetsByTitle['AFTMs'];

  await workShiftSheet.loadCells('A1:C1000');
  await userContactSheet.loadCells('A1:C1000');

  const now = moment().tz('America/Sao_Paulo');
  const currentDate = now.format('DD/MM/YYYY');
  const currentTime = now.format('HH:mm');

  let targetDate = currentDate;
  let currentShift = 'Plantão Manhã';

  if (currentTime > '17:00') {
    targetDate = moment(currentDate, 'DD/MM/YYYY').add(1, 'days').format('DD/MM/YYYY');
    currentShift = 'Plantão Manhã';
  } else if (currentTime > '12:30') {
    currentShift = 'Plantão Tarde';
  }

  let currentUser, nextUser;

  for (let i = 1; i < workShiftSheet.rowCount; i++) {
    if (workShiftSheet.getCell(i, 0).value === targetDate) {
      if (currentShift === 'Plantão Manhã') {
        currentUser = workShiftSheet.getCell(i, 1).value;
        nextUser = workShiftSheet.getCell(i, 2).value;
      } else {
        currentUser = workShiftSheet.getCell(i, 2).value;
        nextUser = workShiftSheet.getCell(i + 1, 1).value;
      }
      break;
    }
  }

  const currentEmail = userContactSheet.getCell(userContactSheet.getCell(1, 0).value.indexOf(currentUser) + 1, 2).value;
  const nextEmail = userContactSheet.getCell(userContactSheet.getCell(1, 0).value.indexOf(nextUser) + 1, 2).value;

  return [currentEmail, nextEmail];
};

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
    const jsonData = JSON.parse(event.body);

    const protocolNumber = await generateProtocolNumber();
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
