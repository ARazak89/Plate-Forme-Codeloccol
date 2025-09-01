import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export async function sendMail(to, subject, text) {
  try {
    if (!process.env.EMAIL_HOST) return; // stub if not configured
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });
  } catch (e) {
    console.error("Email error:", e.message);
  }
}
