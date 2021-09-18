declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BASEROW_TOKEN: string
      BOT_TOKEN: string
    }
  }
}

export {}
