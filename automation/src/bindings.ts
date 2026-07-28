export type SecretBindings = {
  SIGNING_SECRET: string;
  DASHBOARD_PASSWORD: string;
  DASHBOARD_SESSION_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  TELEGRAM_WEBHOOK_SECRET: string;
};

export type Bindings = Cloudflare.Env & SecretBindings;

export type AppEnvironment = {
  Bindings: Bindings;
  Variables: {
    requestId: string;
  };
};
