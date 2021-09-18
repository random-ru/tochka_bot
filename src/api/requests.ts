import axios, { AxiosRequestConfig } from 'axios'
import { User } from '@app/types'

type RawUser = User & { telegramId: string }

const normalize = (user: RawUser): User => ({
  ...user,
  telegramId: Number(user.telegramId),
})

function createUserRequests(tableId: number) {
  const instance = axios.create({
    baseURL: `https://api.baserow.io/api/database/rows/table/${tableId}`,
    headers: {
      Authorization: `Token ${process.env.BASEROW_TOKEN}`,
    },
    params: {
      user_field_names: true,
    },
  })

  async function request<T = void>(config: AxiosRequestConfig): Promise<T> {
    return instance(config).then((response) => response.data)
  }

  const list = () =>
    request<{ results: RawUser[] }>({ method: 'GET' }).then((response) => response.results.map(normalize))

  const find = async (telegramId: number) => {
    const all = await list()
    const found = all.find((user) => user.telegramId === telegramId)
    if (!found) throw new Error('Not Found')
    return found
  }

  return {
    list,
    get: (telegramId: number) => find(telegramId),
    create: (telegramId: number) => request<RawUser>({ method: 'POST', data: { telegramId } }).then(normalize),
    delete: async (telegramId: number) => {
      const user = await find(telegramId)
      return request({ method: 'DELETE', url: String(user.id) })
    },
  }
}

export const admins = createUserRequests(29829)
export const blacklistedUsers = createUserRequests(29836)
export const whitelistedUsers = createUserRequests(29837)
