require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log('Testing connection with:');
console.log('USER:', process.env.EMAIL_USER);
console.log('PASS LENGTH:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Server is ready to take our messages');
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Manual Test Email',
      text: 'If you see this, the email system is working!',
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('❌ Send failed:', err.message);
      } else {
        console.log('✅ Email sent successfully:', info.response);
      }
      process.exit(0);
    });
  }
});
