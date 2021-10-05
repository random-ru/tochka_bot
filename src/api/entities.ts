import { createVault } from 'rnd-vault'

const vault = createVault({
  space: process.env.VAULT_SPACE,
  app: process.env.VAULT_APP,
  spaceKey: process.env.VAULT_SPACE_KEY,
  appKey: process.env.VAULT_APP_KEY,
})

export interface RangesBlacklist {
  [key: string]: [string, string]
}

const ID_OPTIONS = {
  serialize: (value: number) => String(value),
  deserialize: (value: string) => Number(value),
}

export const admins = vault.collection<number, string>('admins', ID_OPTIONS)
export const blacklist = vault.collection<number, string>('blacklist', ID_OPTIONS)
export const whitelist = vault.collection<number, string>('whitelist', ID_OPTIONS)
export const rangesBlacklist = vault.field<RangesBlacklist>('ranges_blacklist')
