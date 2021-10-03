import { admins, blacklist, whitelist } from '@app/model'

async function isAdmin(telegramId: number): Promise<boolean> {
  const list = admins.store.getState()
  if (!list) return false
  return list.includes(telegramId)
}

async function isBlacklisted(telegramId: number): Promise<boolean> {
  const list = blacklist.store.getState()
  if (!list) return false
  return list.includes(telegramId)
}

async function isWhitelisted(telegramId: number): Promise<boolean> {
  const list = whitelist.store.getState()
  if (!list) return false
  return list.includes(telegramId)
}

export const userEntity = {
  isAdmin,
  isBlacklisted,
  isWhitelisted,
}
