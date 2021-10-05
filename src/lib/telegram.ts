import TelegramBot from 'node-telegram-bot-api'

function getUser(message: TelegramBot.Message) {
  return message.from
}

export const telegramLib = {
  getUser,
}
