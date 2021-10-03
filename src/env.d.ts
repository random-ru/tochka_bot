declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string
      VAULT_SPACE_KEY: string
      VAULT_APP_KEY: string
    }
  }
}

export {}
