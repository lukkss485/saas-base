declare namespace NodeJS {
  interface ProcessEnv {
    PORT?: string;
    DATABASE_URL: string;
    JWT_SECRET: string;
    APP_URL: string;
    API_PUBLIC_URL: string;
    MP_ACCESS_TOKEN: string;
    MP_WEBHOOK_SECRET?: string;
    RESEND_API_KEY?: string;
    MAIL_FROM?: string;
  }
}