const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.trucklineup.app';
const EMAIL_FROM = process.env.SMTP_FROM || 'noreply@mg.trucklineup.app';

export async function sendEmail(to: string[], subject: string, html: string) {
  if (!MAILGUN_API_KEY) {
    console.warn('MAILGUN_API_KEY not configured, skipping email');
    return;
  }

  try {
    const form = new URLSearchParams();
    form.append('from', EMAIL_FROM);
    form.append('to', to.join(', '));
    form.append('subject', subject);
    form.append('html', html);

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64'),
        },
        body: form,
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error('Mailgun API error:', response.status, body);
    } else {
      console.log('Email sent to:', to.join(', '));
    }
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}
