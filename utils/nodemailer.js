import nodemailer from 'nodemailer';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const emailVerificationContentTemplatePath = join(
  __dirname,
  'emailTemplates',
  'verifyEmail.html'
);

const resetPasswordContentTemplatePath = join(
  __dirname,
  'emailTemplates',
  'resetPassword.html'
);
const emailVerificationContentTemplate = readFileSync(
  emailVerificationContentTemplatePath,
  'utf-8'
);

const resetPasswordContentTemplate = readFileSync(
  resetPasswordContentTemplatePath,
  'utf-8'
);

const transporter = nodemailer.createTransport({
  host: process.env.HOST,
  port: process.env.EMAIL_PORT,
  service: process.env.SERVICE,
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
  tls: { rejectUnauthorized: false },
});

const verifyEmail = async ({ email, link, firstName }) => {
  const emailVerificationContent = emailVerificationContentTemplate
    .replace('{{link}}', link)
    .replace('{{firstName}}', firstName);
  try {
    const mailOption = {
      from: {
        name: 'middlewareDebugger',
        address: process.env.USER,
      },
      to: email,
      subject: 'Email verification',
      html: emailVerificationContent,
    };

    const info = await transporter.sendMail(mailOption);
    console.log('Email sent successfully', info.message);
    return info;
  } catch (error) {
    console.log(error);
  }
};

const resetPasswordMessage = async ({ email, link, firstName }) => {
  try {
    const resetPasswordContent = resetPasswordContentTemplate
      .replace('{{firstName}}', firstName)
      .replace('{{link}}', link);

    const info = await transporter.sendMail({
      from: {
        name: 'middlewareDebugger',
        address: process.env.USER,
      },
      to: email,
      subject: 'Password reset',
      html: resetPasswordContent,
    });

    console.log('message sent:', info.message);
    return info;
  } catch (error) {
    console.log(error.message);
  }
};

export { verifyEmail, resetPasswordMessage };
