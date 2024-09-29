```javascript
const crypto = require('crypto-js');
const nodemailer = require('nodemailer');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { formData, fileData, fileName } = JSON.parse(event.body);

    // Decrypt form data
    const decryptedFormData = JSON.parse(crypto.AES.decrypt(formData, 'secret_key').toString(crypto.enc.Utf8));

    // Decrypt file data
    const decryptedFileData = crypto.AES.decrypt(fileData, 'secret_key').toString(crypto.enc.Utf8);

    // Set up email transporter (using Gmail in this example)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'  // Use an app password, not your regular password
      }
    });

    // Prepare email content
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: 'recipient1@example.com, recipient2@example.com',  // Add all recipient emails here
      subject: 'New Form Submission',
      text: `
        Name: ${decryptedFormData.name}
        Email: ${decryptedFormData.email}
        Message: ${decryptedFormData.message}
      `,
      attachments: [
        {
          filename: fileName,
          content: decryptedFileData.split('base64,')[1],
          encoding: 'base64'
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Form submitted successfully' }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to process form submission' }) };
  }
};
```
