import { createEvent, forward } from 'effector'
import { Api } from '@app/api'
import { createSource } from '@app/lib/effector'

export const botLaunched = createEvent()

export const admins = createSource({ query: () => Api.admins.getAll() })
export const blacklist = createSource({ query: () => Api.blacklist.getAll() })
export const whitelist = createSource({ query: () => Api.whitelist.getAll() })
export const rangesBlacklist = createSource({ query: () => Api.rangesBlacklist.get() })

export const loadData = createEvent()

forward({
  from: loadData,
  to: [admins.load, blacklist.load, whitelist.load, rangesBlacklist.load],
})

forward({
  from: botLaunched,
  to: loadData,
})
