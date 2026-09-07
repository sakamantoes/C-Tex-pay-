import dotenv from 'dotenv';
dotenv.config();

const envConfig = {
    PORT: process.env.PORT || 5000,
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,
    DB_PORT: process.env.DB_PORT,
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
    FRONTEND_URL: process.env.FRONTEND_URL,

    // mailing for development
    NODE_ENV: process.env.NODE_ENV || "development",
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    MAIL_FROM: process.env.MAIL_FROM,

    // mailing for production
    RESEND_API_KEY: process.env.RESEND_API_KEY,
}

export default envConfig;