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

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { formData } = JSON.parse(event.body);

    // Decrypt data using the stored private key
    const privateKey = process.env.PRIVATE_KEY;
    const decryptedFormData = JSON.parse(
      crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(formData)
      ).toString()
    );

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
      to: [...recipients, process.env.RECIPIENT_EMAILS.split(','), decryptedFormData.emailRequerente].join(','),
      subject: `[Protocolo: ${protocolNumber}] Nova submissão de ITBI`,
      text: `
        Número de Protocolo: ${protocolNumber}

        Dados do Requerente:
        Nome: ${decryptedFormData.nomeRequerente}
        CPF: ${decryptedFormData.cpfRequerente}
        Telefone: ${decryptedFormData.telefoneRequerente}
        Email: ${decryptedFormData.emailRequerente}

        Método de Submissão: ${decryptedFormData.metodoSubmissao}

        ${decryptedFormData.metodoSubmissao === 'formulario' ? `
        Dados da Transação:
        Tipo de Transação: ${decryptedFormData.tipoTransacao}
        Valor Total: R$ ${decryptedFormData.valorTotal}
        Valor Financiado: R$ ${decryptedFormData.valorFinanciado}
        Valor à Vista: R$ ${decryptedFormData.valorAVista}
        Data da Transmissão: ${decryptedFormData.dataTransmissao}

        Dados do Imóvel:
        Inscrição Imobiliária: ${decryptedFormData.inscricaoImobiliaria}
        Matrícula: ${decryptedFormData.matriculaImovel}
        Endereço: ${decryptedFormData.logradouroImovel}, ${decryptedFormData.numeroImovel}
        Complemento: ${decryptedFormData.complementoImovel}
        Bairro: ${decryptedFormData.bairroImovel}
        Cidade: ${decryptedFormData.cidadeImovel}
        Estado: ${decryptedFormData.estadoImovel}
        CEP: ${decryptedFormData.cepImovel}

        Dados do Adquirente:
        Nome: ${decryptedFormData.nomeAdquirente}
        CPF/CNPJ: ${decryptedFormData.cpfAdquirente || decryptedFormData.cnpjAdquirente}
        Email: ${decryptedFormData.emailAdquirente}
        Telefone: ${decryptedFormData.telefoneAdquirente}

        Dados do Transmitente:
        Nome: ${decryptedFormData.nomeTransmitente}
        CPF/CNPJ: ${decryptedFormData.cpfTransmitente || decryptedFormData.cnpjTransmitente}
        Email: ${decryptedFormData.emailTransmitente}
        Telefone: ${decryptedFormData.telefoneTransmitente}
        ` : ''}

        IP do Remetente: ${decryptedFormData.ipAddress}
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
