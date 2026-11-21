import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }) {
  if (!process.env.SMTP_PASS && process.env.NODE_ENV !== 'production') {
    console.log('[DEV MAILER]', opts.to, opts.subject, opts.text);
    return;
  }
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'MedVault <noreply@medvault.example.com>',
    ...opts,
  });
}
