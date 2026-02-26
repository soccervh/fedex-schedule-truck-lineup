import nodemailer from 'nodemailer';

const smtpPort = parseInt(process.env.SMTP_PORT || '465');
const transporter =
  process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

export async function sendEmail(to: string[], subject: string, html: string) {
  if (!transporter) {
    console.warn('SMTP not configured, skipping email');
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@fedex-lineup.local',
      to: to.join(', '),
      subject,
      html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}
