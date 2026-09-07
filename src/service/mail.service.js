
import nodemailer from "nodemailer";
import { Resend } from "resend";
import envConfig from "../config/constant.js";

const isProduction = envConfig.NODE_ENV === "production";

// Resend client for production

const resend = isProduction
  ? new Resend(envConfig.RESEND_API_KEY)
  : null;


// nodemailer transporter for development

const transporter = !isProduction
  ? nodemailer.createTransport({
      host: envConfig.SMTP_HOST,
      port: Number(envConfig.SMTP_PORT),
      secure: Number(envConfig.SMTP_PORT) === 465,
      auth: {
        user: envConfig.SMTP_USER,
        pass: envConfig.SMTP_PASSWORD,
      },
    })
  : null;


// send email

export const sendMail = async ({ to, subject, message }) => {
  if (!to || !subject || !message) {
    throw new Error("to, subject and message are required");
  }

  try {

// production → Resend

    if (isProduction) {
      const { data, error } = await resend.emails.send({
        from: envConfig.MAIL_FROM,
        to: [to],
        subject,
        html: message,
      });

      if (error) {
        console.error("Resend Error:", error);
        throw error;
      }

      console.log(`Email sent via Resend to ${to}`);

      return {
        provider: "resend",
        data,
      };
    }


    // development → Nodemailer

    const info = await transporter.sendMail({
      from: envConfig.MAIL_FROM,
      to,
      subject,
      html: message,
    });

    console.log(`Email sent via Nodemailer to ${to}`);
    console.log(`Message ID: ${info.messageId}`);

    return {
      provider: "nodemailer",
      data: info,
    };
  } catch (error) {
    console.error("Email Service Error:", error);

    throw new Error("Failed to send email");
  }
};

