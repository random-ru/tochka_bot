import TelegramBot from 'node-telegram-bot-api'
import { Api } from './api'
import { Collection, Dictionary } from './dictionary'
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

async function getMention(user: TelegramBot.User) {
  if (user.username) {
    return `@${user.username}`
  }

  const senderIsBlacklisted = await userEntity.isBlacklisted(user.id)
  const statusKey = senderIsBlacklisted ? 'BLACKLISTED' : 'DEFAULT'
  return Dictionary.getMessage(Dictionary.MESSAGES.DOTNET.NO_USERNAME_MENTION[statusKey])
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

  function replyToSender(collection: Collection) {
    if (!sender) return
    bot.sendMessage(message.chat.id, Dictionary.getMessage(collection, { key: sender.id }), {
      reply_to_message_id: message.message_id,
      disable_notification: true,
    })
  }

  if (!senderIsAdmin) {
    return replyToSender(Dictionary.MESSAGES.NO_ACCESS)
  }

  if (message.text === COMMANDS.RELOAD) {
    loadData()
    return replyToSender(Dictionary.MESSAGES.RELOAD)
  }

  const reply = message.reply_to_message

  if (!reply) {
    return replyToSender(Dictionary.MESSAGES.NO_REPLY)
  }

  const target = reply.from
  if (!target) return

  const targetIsAdmin = await userEntity.isAdmin(target.id)

  if (targetIsAdmin) {
    return replyToSender(Dictionary.MESSAGES.TARGET_IS_INVULNERABLE)
  }

  const botProfile = await bot.getMe()
  const targetIsBot = target.id === botProfile.id

  if (targetIsBot) {
    return replyToSender(Dictionary.MESSAGES.TARGET_IS_BOT)
  }

  function replyToTarget(collection: Collection) {
    if (!reply) return
    bot.deleteMessage(message.chat.id, String(message.message_id))
    bot.sendMessage(message.chat.id, Dictionary.getMessage(collection), {
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
    return replyToTarget(Dictionary.MESSAGES.DOTNET.BLACKLIST_ADD)
  }

  if (message.text === COMMANDS.WHITELIST_ADD) {
    await clearLists(target.id)
    await Api.whitelist.addOne(target.id)
    reloadLists()
    return replyToTarget(Dictionary.MESSAGES.DOTNET.WHITELIST_ADD)
  }

  if (message.text === COMMANDS.BLACKLIST_REMOVE) {
    await clearLists(target.id)
    return replyToTarget(Dictionary.MESSAGES.DOTNET.BLACKLIST_REMOVE)
  }

  if (message.text === COMMANDS.WHITELIST_REMOVE) {
    await clearLists(target.id)
    return replyToTarget(Dictionary.MESSAGES.DOTNET.WHITELIST_REMOVE)
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
  const mention = await getMention(sender)

  const reply = (text: string) => {
    bot.sendMessage(message.chat.id, text, { disable_notification: true })
  }

  const characterKey = hasBlacklistedSymbolAtTheEnd ? 'UNICODE' : 'DOT'
  const statusKey = senderIsBlacklisted ? 'BLACKLISTED' : 'DEFAULT'
  const collection = Dictionary.MESSAGES.DOTNET.MESSAGE_BLOCKED[characterKey][statusKey]

  const replyText = Dictionary.getMessage(collection, {
    key: sender.id,
    values: { mention },
  })

  return reply(replyText)
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
