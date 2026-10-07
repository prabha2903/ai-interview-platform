const nodemailer = require("nodemailer");
const logger = require("./logger");

let cachedTransporter = null;

const isEmailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return cachedTransporter;
};

/**
 * Sends an email if SMTP credentials are configured. If they are not
 * (e.g. local development or a demo/portfolio deployment without a mail
 * provider), the message is logged to the console instead of failing the
 * request, so flows like "forgot password" remain testable end-to-end.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!isEmailConfigured()) {
    logger.info(
      { to, subject },
      "SMTP not configured — logging email instead of sending. Set SMTP_HOST/SMTP_USER/SMTP_PASS to send for real."
    );
    logger.debug({ body: text || html }, "Email body");
    return { delivered: false, mode: "console" };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `"AI Interview Platform" <no-reply@ai-interview-platform.local>`,
    to,
    subject,
    html,
    text,
  });

  return { delivered: true, mode: "smtp" };
};

module.exports = { sendEmail, isEmailConfigured };
