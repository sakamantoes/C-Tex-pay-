
import nodemailer from "nodemailer";
import { Resend } from "resend";
import envConfig from "../config/constant.js";

const isProduction =envConfig.NODE_ENV === "production";

/*
|--------------------------------------------------------------------------
| Development: Nodemailer
|--------------------------------------------------------------------------
*/

const transporter = !isProduction
  ? nodemailer.createTransport({
      host:envConfig.SMTP_HOST,
      port: Number(envConfig.SMTP_PORT),
      secure: Number(envConfig.SMTP_PORT) === 465,
      auth: {
        user:envConfig.SMTP_USER,
        pass:envConfig.SMTP_PASSWORD,
      },
    })
  : null;


/*
|--------------------------------------------------------------------------
| Production: Resend
|--------------------------------------------------------------------------
*/

const resend = isProduction
  ? new Resend(envConfig.RESEND_API_KEY)
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
        from:envConfig.MAIL_FROM,
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
      from:envConfig.MAIL_FROM,
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

