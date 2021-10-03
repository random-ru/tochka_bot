import TelegramBot from 'node-telegram-bot-api'
import { Api } from './api'
import { userEntity } from './entities/user'
import { stringsLib } from './lib/strings'
import { blacklist, botLaunched, loadData, whitelist } from './model'

const bot = new TelegramBot(process.env.BOT_TOKEN)

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
  const sender = getUser(message)
  if (!sender) return false

  if (sender.username) {
    return `@${sender.username}`
  }

  const senderIsBlacklisted = await userEntity.isBlacklisted(sender.id)
  return senderIsBlacklisted ? 'Падонак позорный' : 'Слышь, этот самый'
}

const COMMANDS = {
  RELOAD: '-reload',
  BLACKLIST_ADD: '-dotnet blacklist',
  BLACKLIST_REMOVE: '-dotnet blacklist remove',
  WHITELIST_ADD: '-dotnet whitelist',
  WHITELIST_REMOVE: '-dotnet whitelist remove',
}

function isCommand(message: TelegramBot.Message) {
  if (!message.text) return false
  return Object.values(COMMANDS).includes(message.text)
}

async function handleCommand(message: TelegramBot.Message) {
  const sender = message.from
  if (!sender) return

  const senderIsAdmin = await userEntity.isAdmin(sender.id)

  function replyToSender(text: string) {
    bot.sendMessage(message.chat.id, text, {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    })
  }

  if (!senderIsAdmin) {
    return replyToSender('Лямку завяжи, сынок ёбанный')
  }

  if (message.text === COMMANDS.RELOAD) {
    loadData()
    return replyToSender('Повинуюсь, господин')
  }

  const reply = message.reply_to_message

  if (!reply) {
    return replyToSender('Ваше превосходительство, сделайте реплай пожалуйста, ня')
  }

  const target = reply.from
  if (!target) return

  const targetIsAdmin = await userEntity.isAdmin(target.id)

  if (targetIsAdmin) {
    return replyToSender('Фрэндли фаер?')
  }

  const botProfile = await bot.getMe()
  const targetIsBot = target.id === botProfile.id

  if (targetIsBot) {
    return replyToSender('Я с тебя админку щас сниму нахуй')
  }

  function replyToTarget(text: string) {
    if (!reply) return
    bot.deleteMessage(message.chat.id, String(message.message_id))
    bot.sendMessage(message.chat.id, text, {
      reply_to_message_id: reply.message_id,
    })
  }

  async function clearLists(id: number) {
    await Api.whitelist.deleteOne(id)
    await Api.blacklist.deleteOne(id)
  }

  async function reloadLists() {
    whitelist.load()
    blacklist.load()
  }

  if (message.text === COMMANDS.BLACKLIST_ADD) {
    await clearLists(target.id)
    await Api.blacklist.addOne(target.id)
    reloadLists()
    return replyToTarget('Ахахах попался, ищи себя в паблике прошмандовки Азербайджана')
  }

  if (message.text === COMMANDS.WHITELIST_ADD) {
    await clearLists(target.id)
    await Api.whitelist.addOne(target.id)
    reloadLists()
    return replyToTarget('Пересып с админом засчитан')
  }

  if (message.text === COMMANDS.BLACKLIST_REMOVE) {
    await clearLists(target.id)
    return replyToTarget('Наныл себе разблокировку, поздравляю')
  }

  if (message.text === COMMANDS.WHITELIST_REMOVE) {
    await clearLists(target.id)
    return replyToTarget('Лошара)')
  }
}

async function handleDefault(message: TelegramBot.Message) {
  if (!message.text) return

  const sender = message.from
  if (!sender) return

  const senderIsAdmin = await userEntity.isAdmin(sender.id)
  const senderIsWhitelisted = await userEntity.isWhitelisted(sender.id)
  if (senderIsAdmin || senderIsWhitelisted) return

  const senderIsBlacklisted = await userEntity.isBlacklisted(sender.id)
  const { hasDotAtTheEnd, hasBlacklistedSymbolAtTheEnd } = stringsLib.analyze(message.text, senderIsBlacklisted)
  if (!hasDotAtTheEnd && !hasBlacklistedSymbolAtTheEnd) return

  const willReply = canReply(message)
  await bot.deleteMessage(message.chat.id, String(message.message_id))

  if (!willReply) return
  const mention = await getMention(message)

  const reply = (text: string) => {
    bot.sendMessage(message.chat.id, text, { disable_notification: true })
  }

  if (senderIsBlacklisted && hasBlacklistedSymbolAtTheEnd) {
    return reply(`${mention}, может уже ливнешь просто? Пытается он тут`)
  }

  if (senderIsBlacklisted && hasDotAtTheEnd) {
    return reply(`${mention}, ливни нахуй вместе со своей точкой`)
  }

  if (hasBlacklistedSymbolAtTheEnd) {
    return reply(`${mention}, тут юникод запрещен, ебало вырубай нахуй`)
  }

  if (hasDotAtTheEnd) {
    return reply(`${mention}, хули такой серьезный? Точку завяжи свою`)
  }
}

async function handleMessage(message: TelegramBot.Message) {
  const user = getUser(message)
  if (!user) return

  try {
    if (isCommand(message)) {
      return await handleCommand(message)
    }

    return await handleDefault(message)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(error)
  }
}

bot.on('message', handleMessage)
bot.on('edited_message', handleMessage)

export async function bootstrap() {
  bot.startPolling()
  botLaunched()
}
