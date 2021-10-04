import { Time } from './lib/time'

interface RandomCollection {
  type: 'random'
  phrases: string[]
}

interface GradientCollection {
  type: 'gradient'
  phrases: string[]
  meta: { time: number }
}

export type Collection = RandomCollection | GradientCollection

const random = (phrases: string[]): RandomCollection => ({
  type: 'random',
  phrases,
})

const gradient = (time: Time, phrases: string[]): GradientCollection => ({
  type: 'gradient',
  phrases,
  meta: { time },
})

const MESSAGES = {
  NO_ACCESS: gradient(Time.Minutes_30, [
    'Лямку завяжи, сынок ёбанный',
    'Мать давно чекал?',
    'Не ясно что ли?',
    'Я уже говорил тебе, что такое безумие?',
    'Безумие — это точное повторение одного и того же действия раз за разом в надежде на изменение',
    'Это.',
    'Есть.',
    'Безумие.',
  ]),
  RELOAD: gradient(Time.Hour, [
    'Повинуюсь, господин',
    'Будет сделано, сэр',
    'Ну, без бога!',
    'Мисье, а хули так часто?',
    'ШШШШШШ',
    'Какое зло я тебе сделал?',
    'Хватит уже меня угнетать',
    'Да ты заебал, гандон, думаешь неуязвимый такой с админкой?',
  ]),
  NO_REPLY: gradient(Time.Minutes_30, [
    'Ваше превосходительство, сделайте реплай пожалуйста, ня',
    'Где айкью потерял?',
    'Ты короной в тяжелой форме переболел?',
  ]),
  TARGET_IS_INVULNERABLE: random([
    'Фрэндли фаер?',
    'Пиу пиу пиу',
    'Я обязательно сделаю то что ты попросил',
    'Ну в общем я все сделал, просто поверь',
    'Он невкусный',
    'Сорян, но нет',
    'Я не могу убить бога',
  ]),
  TARGET_IS_BOT: random(['А ты не прихуел?', 'Я с тебя админку сниму нахуй']),
  DOTNET: {
    NO_USERNAME_MENTION: {
      DEFAULT: random(['Безымянный.jpg', 'Новая папка', 'Новая папка (2)', 'хуй', 'Документ Microsoft Word']),
      BLACKLISTED: random(['Псина подзаборная', 'Тварь дрожжащая', 'Падонак позорный', 'Чмо дырявое', 'Говноед']),
    },
    MESSAGE_BLOCKED: {
      DOT: {
        DEFAULT: gradient(Time.Minutes_30, [
          '{{mention}}, хули такой серьезный? Точку завяжи свою',
          '{{mention}}, тебе нравится причинять другим боль?',
          '{{mention}}, до тебя долго доходит что ли?',
          '{{mention}}, еще раз повторяю, либо точку завязываешь, либо ливаешь нахуй',
        ]),
        BLACKLISTED: gradient(Time.Minutes_30, [
          '{{mention}}, ливни нахуй вместе со своей точкой',
          '{{mention}}, да выметайся уже',
          '{{mention}}, какая же ты назойливая прошмандовка)',
        ]),
      },
      UNICODE: {
        DEFAULT: gradient(Time.Minutes_30, [
          '{{mention}}, тут юникод запрещен, ебало вырубай нахуй',
          '{{mention}}, ну давай давай, еще поищи символов',
          '{{mention}}, не заебался еще?',
        ]),
        BLACKLISTED: gradient(Time.Minutes_30, [
          '{{mention}}, может уже ливнешь просто? Пытается он тут',
          '{{mention}}, просто ливни, никто тебя не будет больше обижать',
          '{{mention}}, ты @Izbushka?',
        ]),
      },
    },
    BLACKLIST_ADD: random(['Ахахах попался, ищи себя в паблике прошмандовки Азербайджана']),
    BLACKLIST_REMOVE: random(['Наныл себе разблокировку? Поздравляю']),
    WHITELIST_ADD: random(['Пересып с админом засчитан']),
    WHITELIST_REMOVE: random(['Лошара)']),
  },
}

type GradientKey = unknown

interface Options {
  key?: GradientKey
  values?: Record<string, string>
}

function populate(message: string, values: Record<string, string> = {}) {
  return Object.entries(values).reduce((acc, [key, value]) => {
    return acc.replace(`{{${key}}}`, value)
  }, message)
}

function getRandomMessage(collection: RandomCollection, options: Options): string {
  const index = Math.floor(Math.random() * collection.phrases.length)
  return populate(collection.phrases[index], options.values)
}

interface GradientInfo {
  lastMessageAt: number
  messageIndex: number
}

const DEFAULT_GRADIENT_INFO: GradientInfo = {
  lastMessageAt: Number.NEGATIVE_INFINITY,
  messageIndex: -1,
}

const gradientCache = new Map<GradientKey, GradientInfo>()

function getGradientMessage(collection: GradientCollection, options: Options): string {
  if (!options.key) throw new Error(`Option 'key' should be specified for Gradient dictionary collection`)
  const info = gradientCache.get(options.key) || DEFAULT_GRADIENT_INFO
  let { lastMessageAt, messageIndex } = info

  const now = Date.now()
  const timePassed = now - lastMessageAt > collection.meta.time

  if (timePassed) messageIndex = 0
  else messageIndex = Math.min(messageIndex + 1, collection.phrases.length - 1)

  lastMessageAt = now
  gradientCache.set(options.key, { lastMessageAt, messageIndex })
  return populate(collection.phrases[messageIndex], options.values)
}

function getMessage(collection: Collection, options: Options = {}): string {
  if (collection.type === 'random') return getRandomMessage(collection, options)
  if (collection.type === 'gradient') return getGradientMessage(collection, options)
  return '404 Not Found'
}

export const Dictionary = {
  getMessage,
  MESSAGES,
}
