
import nodemailer from "nodemailer";
import { Resend } from "resend";
import env from "../config/constant.js";

const isProduction = env.NODE_ENV === "production";

/*
|--------------------------------------------------------------------------
| Development: Nodemailer
|--------------------------------------------------------------------------
*/

const transporter = !isProduction
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT),
      secure: Number(env.SMTP_PORT) === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    })
  : null;


/*
|--------------------------------------------------------------------------
| Production: Resend
|--------------------------------------------------------------------------
*/

const resend = isProduction
  ? new Resend(env.RESEND_API_KEY)
  : null;


/*
|--------------------------------------------------------------------------
| Send Mail
|--------------------------------------------------------------------------
*/

export const sendMail = async ({ to, subject, message }) => {
  if (!to || !subject || !message) {
    throw new Error("to, subject and message are required");
  }

  try {
    /*
    |--------------------------------------------------------------------------
    | DEVELOPMENT
    |--------------------------------------------------------------------------
    */

    if (!isProduction) {
      console.log("📧 Sending email using Nodemailer (development)");

      const info = await transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        html: message,
      });

      console.log("✅ Email sent using Nodemailer:", info.messageId);

      return {
        provider: "nodemailer",
        data: info,
      };
    }


    /*
    |--------------------------------------------------------------------------
    | PRODUCTION
    |--------------------------------------------------------------------------
    */

    console.log("📧 Sending email using Resend (production)");

    const { data, error } = await resend.emails.send({
      from: env.MAIL_FROM,
      to: [to],
      subject,
      html: message,
    });

    if (error) {
      console.error("Resend Error:", error);
      throw error;
    }

    console.log("✅ Email sent using Resend");

    return {
      provider: "resend",
      data,
    };

  } catch (error) {
    console.error("Email Service Error:", error);

    throw new Error("Failed to send email");
  }
};

