import TelegramBot from 'node-telegram-bot-api'
import { telegramLib } from './lib/telegram'

type BlockedPhraseConfig = {
  [id in number | 'all']?: RegExp[]
}

const OVERLAPS: Record<string, string[]> = {
  о: ['О', 'o', 'O', '0'],
  р: ['Р', 'p', 'P'],
  п: ['П'],
  и: ['И'],
  д: ['Д'],
  ж: ['Ж'],
}

const CHECKED_PHRASE_RANGES: Record<string, [number, number]> = {
  Latin: [0x0000, 0x007f],
  Cyrillic: [0x0400, 0x04ff],
}

function getCharWithOverlaps(char: string): string {
  let completed = char
  const overlaps = OVERLAPS[char]
  if (!overlaps) return completed
  for (const overlap of overlaps) {
    completed += overlap
  }
  return completed
}

function phrase(string: string): RegExp[] {
  const charGroups: string[] = []
  for (const char of string) {
    const withOverlaps = getCharWithOverlaps(char)
    charGroups.push(`[${withOverlaps}]+`)
  }
  const main = charGroups.join(`[ ]*`)

  return [` ${main} `, `^${main} `, ` ${main}$`, `^${main}$`].map((regexpString) => new RegExp(regexpString))
}

const BLOCKED_PHRASES: BlockedPhraseConfig = {
  /* Соре суацк */
  323030186: [...phrase('поридж'), ...phrase('поредж')],
  /* Ливни нахуй */
  1528363783: phrase('ор'),
}

function matchesPhraseRegexps(string: string, regexps: RegExp[]) {
  const ranges = Object.values(CHECKED_PHRASE_RANGES)

  let cleanedString = ''
  for (const char of string) {
    const code = char.codePointAt(0)
    if (!code) continue
    const inRanges = ranges.some(([start, end]) => code >= start && code <= end)
    if (!inRanges) continue
    cleanedString += char
  }

  return regexps.some((regexp) => cleanedString.match(regexp))
}

export function messageHasBlockedPhrase(message: TelegramBot.Message): boolean {
  if (!message.text) return false
  const user = telegramLib.getUser(message)
  if (!user) return false
  if (BLOCKED_PHRASES.all) {
    const matches = matchesPhraseRegexps(message.text, BLOCKED_PHRASES.all)
    if (matches) return true
  }
  const blockedRegexps = BLOCKED_PHRASES[user.id]
  if (!blockedRegexps) return false
  return matchesPhraseRegexps(message.text, blockedRegexps)
}
