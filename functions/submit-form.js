const { GoogleSpreadsheet } = require('google-spreadsheet');
const moment = require('moment-timezone');
const nodemailer = require('nodemailer');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const protocolNumber = await generateProtocolNumber();
        const recipients = await getRecipients();

        // Enviar e-mails
        await sendEmails(data, protocolNumber, recipients);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Formulário enviado com sucesso', protocolNumber })
        };
    } catch (error) {
        console.error('Erro:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Erro ao processar o formulário' })
        };
    }
};

async function generateProtocolNumber() {
    const lastProtocol = parseInt(process.env.LAST_PROTOCOL || '0');
    const newProtocol = lastProtocol + 1;
    
    // Atualizar a variável de ambiente
    process.env.LAST_PROTOCOL = newProtocol.toString();

    // Gerar o número de protocolo formatado
    const now = moment().tz('America/Sao_Paulo');
    const formattedProtocol = `${now.format('YYYY.MM.DD.HH.mm')}.${newProtocol.toString().padStart(6, '0')}`;
    
    return formattedProtocol;
}

async function getRecipients() {
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID);
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
}

async function sendEmails(data, protocolNumber, recipients) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: recipients.join(', '),
        subject: `Novo Requerimento ITBI - Protocolo ${protocolNumber}`,
        text: `
            Novo requerimento ITBI recebido:

            Número de Protocolo: ${protocolNumber}
            Data e Hora: ${moment().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss')}

            Dados do Requerimento:
            ${JSON.stringify(data, null, 2)}
        `,
        html: `
            <h2>Novo requerimento ITBI recebido</h2>
            <p><strong>Número de Protocolo:</strong> ${protocolNumber}</p>
            <p><strong>Data e Hora:</strong> ${moment().tz('America/Sao_Paulo').format('DD/MM/YYYY HH:mm:ss')}</p>
            <h3>Dados do Requerimento:</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `
    };

    await transporter.sendMail(mailOptions);
}
