import { rangesBlacklist } from '@app/model'

function hasDotAtTheEnd(string: string, strict: boolean) {
  return string.split('\n').some((line) => {
    if (line === '.') return true

    let dotsInARow = 0
    for (let i = line.length - 1; i > 0; i--) {
      const char = line[i]
      const isDot = char === '.'
      if (isDot && strict) return true
      if (isDot) dotsInARow += 1
      if (dotsInARow >= 2) return false
      if (!isDot && dotsInARow === 0) return false
      if (!isDot && dotsInARow === 1) return true
    }

    return false
  })
}

function hasBlacklistedSymbolAtTheEnd(string: string) {
  const list = rangesBlacklist.store.getState()
  if (!list) return false
  const lastChar = string[string.length - 1]
  return Object.entries(list).some(([_, [start, end]]) => {
    const code = lastChar.codePointAt(0)
    if (!code) return false
    return code >= Number(start) && code <= Number(end)
  })
}

function dotnetAnalyze(string: string, strict = false) {
  return {
    hasDotAtTheEnd: hasDotAtTheEnd(string, strict),
    hasBlacklistedSymbolAtTheEnd: hasBlacklistedSymbolAtTheEnd(string),
  }
}

export const stringsLib = {
  hasDotAtTheEnd,
  hasBlacklistedSymbolAtTheEnd,
  dotnetAnalyze,
}
