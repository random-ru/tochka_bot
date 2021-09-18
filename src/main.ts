import TelegramBot from 'node-telegram-bot-api'
import { Api } from './api'
import { userLib } from './lib/user'

const bot = new TelegramBot(process.env.BOT_TOKEN)

const dots = ['.', '.', '．', '｡', '•', '•', '•', '∙', '.', '.', '.', '﹒', ' ̣', '.͛̾͋', '.̡͇͖', '.', ' ̣', '̣']

function hasDot(text: string, strict = false) {
  return dots.some((dot) => {
    return text.includes(dot)
  })
}

const repliesMap = new Map<number, number>()

const FIVE_MINUTES = 1000 * 60 * 5

function canReply(message: TelegramBot.Message) {
  const sender = message.from
  if (!sender) return false

  const lastReply = repliesMap.get(sender.id) || Number.NEGATIVE_INFINITY
  repliesMap.set(sender.id, Date.now())
  return Date.now() - lastReply > FIVE_MINUTES
}

function getUser(message: TelegramBot.Message) {
  return message.from
}

async function getMention(message: TelegramBot.Message) {
  const sender = message.from
  if (!sender) return false

  const senderIsBlacklisted = await userLib.isBlacklisted(sender.id)
  return senderIsBlacklisted ? 'Падонак позорный' : 'Слышь, этот самый'
}

const COMMANDS = ['.bl', '.wl', '.blr', '.wlr'];

function isCommand(message: TelegramBot.Message) {
  if (!message.text) return false
  return COMMANDS.includes(message.text)
}

async function handleCommand(message: TelegramBot.Message) {
  const sender = message.from
  if (!sender) return

  const senderIsAdmin = await userLib.isAdmin(sender.id)

  if (!senderIsAdmin) {
    bot.sendMessage(message.chat.id, 'Лямку завяжи, сынок ёбанный', {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    })
    return
  }

  const reply = message.reply_to_message

  if (!reply) {
    bot.sendMessage(message.chat.id, 'Ваше превосходительство, сделайте реплай пожалуйста, ня', {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    })
    return;
  }

  const target = reply.from
  if (!target) return;

  const targetIsAdmin = await userLib.isAdmin(target.id)

  if (targetIsAdmin) {
    bot.sendMessage(message.chat.id, 'Фрэндли фаер?', {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    })
    return;
  }

  const botProfile = await bot.getMe()
  const targetIsBot = target.id === botProfile.id

  if (targetIsBot) {
    bot.sendMessage(message.chat.id, 'Я с тебя админку щас сниму нахуй', {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    });
    return;
  }

  async function clearLists(id: number) {
    await Api.whitelistedUsers.delete(id).catch(() => {});
    await Api.blacklistedUsers.delete(id).catch(() => {});
  }

  if (message.text === '.bl') {
    await clearLists(target.id)
    await Api.blacklistedUsers.create(target.id);

    bot.sendMessage(message.chat.id, 'Ахахах попался, ищи себя в паблике прошмандовки Азербайджана', {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    })
  }

  if (message.text === '.wl') {
    await clearLists(target.id)
    await Api.whitelistedUsers.create(target.id)

    bot.sendMessage(message.chat.id, 'Ну лан, побудешь чуток на подсосе', {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    })
  }

  if (message.text === '.blr') {
    await clearLists(target.id)

    bot.sendMessage(message.chat.id, 'Ладно, гуляй пока что', {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    })
  }

  if (message.text === '.wlr') {
    await clearLists(target.id)

    bot.sendMessage(message.chat.id, 'Лошара)', {
      reply_to_message_id: reply.message_id,
      disable_notification: true,
    })
  }
}

async function handleDefault(message: TelegramBot.Message) {
  if (!message.text) return

  const sender = message.from
  if (!sender) return

  const senderIsAdmin = await userLib.isAdmin(sender.id)
  const senderIsWhitelisted = await userLib.isWhitelisted(sender.id)
  if (senderIsAdmin || senderIsWhitelisted) return

  const senderIsBlacklisted = await userLib.isBlacklisted(sender.id)
  const messageIsBlocked = hasDot(message.text, senderIsBlacklisted)
  if (!messageIsBlocked) return

  const willReply = canReply(message)
  await bot.deleteMessage(message.chat.id, String(message.message_id))

  if (!willReply) return
  const mention = await getMention(message)

  if (senderIsBlacklisted) {
    bot.sendMessage(message.chat.id, `${mention}, ливни нахуй`, { disable_notification: true })
  } else {
    bot.sendMessage(message.chat.id, `${mention}, хули такой серьезный?`, { disable_notification: true })
  }
}

async function handleMessage(message: TelegramBot.Message) {
  const user = getUser(message)
  if (!user) return

  if (isCommand(message)) {
    return handleCommand(message)
  }

  return handleDefault(message)
}

bot.on('message', handleMessage)
bot.on('edited_message', handleMessage)

export async function bootstrap() {
  bot.startPolling()
}
