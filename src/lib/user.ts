import { Api } from '@app/api'

async function isAdmin(telegramId: number): Promise<boolean> {
  return Api.admins
    .get(telegramId)
    .then(() => true)
    .catch(() => false)
}

async function isBlacklisted(telegramId: number): Promise<boolean> {
  return Api.blacklistedUsers
    .get(telegramId)
    .then(() => true)
    .catch(() => false)
}

async function isWhitelisted(telegramId: number): Promise<boolean> {
  return Api.whitelistedUsers
    .get(telegramId)
    .then(() => true)
    .catch(() => false)
}

export const userLib = {
  isAdmin,
  isBlacklisted,
  isWhitelisted,
}
