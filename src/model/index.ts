import { createEvent, forward } from 'effector'
import { Api } from '@app/api'
import { regexpsForPhrases } from '@app/blocked-phrases'
import { createSource } from '@app/lib/effector'

export const botLaunched = createEvent()

export const admins = createSource({ query: () => Api.admins.getAll() })
export const blacklist = createSource({ query: () => Api.blacklist.getAll() })
export const whitelist = createSource({ query: () => Api.whitelist.getAll() })
export const rangesBlacklist = createSource({ query: () => Api.rangesBlacklist.get() })
export const blackPhrasesRegExps = createSource({
  query: () => Api.blackPhrases.get(),
  selector: (record) =>
    Object.entries(record).map(([key, phrases]) => {
      if (!phrases) return [key, []]
      return [key, regexpsForPhrases(phrases)] as const
    }),
})

export const loadData = createEvent()

forward({
  from: loadData,
  to: [admins.load, blacklist.load, whitelist.load, rangesBlacklist.load, blackPhrasesRegExps.load],
})

forward({
  from: botLaunched,
  to: loadData,
})
