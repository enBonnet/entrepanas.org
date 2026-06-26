import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

import { baseLocale, cookieName, locales } from '../paraglide/runtime.js'

// ponytail: per-request SSR locale from the cookie. On the client the cookie
// strategy auto-reads document.cookie, so this is only called server-side (see
// __root beforeLoad). For high-concurrency correctness, paraglideMiddleware
// (AsyncLocalStorage) in a custom server entry is the upgrade path.
export const detectLocale = createServerFn({ method: 'GET' }).handler(async () => {
  const cookie = getRequest().headers.get('cookie') ?? ''
  const match = new RegExp(`${cookieName}=(${locales.join('|')})`).exec(cookie)
  return (match?.[1] ?? baseLocale) as (typeof locales)[number]
})
