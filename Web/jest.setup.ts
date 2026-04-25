import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextDecoder, TextEncoder })

class MockRequest {
  url!: string
  method!: string
  headers!: Headers
  body!: any
  cache!: string
  credentials!: string
  integrity!: string
  keepalive!: boolean
  mode!: string
  redirect!: string
  referrer!: string
  referrerPolicy!: string
  signal!: AbortSignal | null
  _cookies!: Map<any, any>
  constructor(input: any, init: any = {}) {
    const urlStr = typeof input === 'string' ? input : input.url
    Object.defineProperty(this, 'url', { value: urlStr, writable: true, configurable: true })
    Object.defineProperty(this, 'method', { value: init.method || 'GET', writable: true, configurable: true })
    Object.defineProperty(this, 'headers', { value: new Headers(init.headers), writable: true, configurable: true })
    Object.defineProperty(this, 'body', { value: init.body || null, writable: true, configurable: true })
    Object.defineProperty(this, 'cache', { value: init.cache || 'default', writable: true, configurable: true })
    Object.defineProperty(this, 'credentials', { value: init.credentials || 'same-origin', writable: true, configurable: true })
    Object.defineProperty(this, 'integrity', { value: init.integrity || '', writable: true, configurable: true })
    Object.defineProperty(this, 'keepalive', { value: init.keepalive || false, writable: true, configurable: true })
    Object.defineProperty(this, 'mode', { value: init.mode || 'cors', writable: true, configurable: true })
    Object.defineProperty(this, 'redirect', { value: init.redirect || 'follow', writable: true, configurable: true })
    Object.defineProperty(this, 'referrer', { value: init.referrer || 'about:client', writable: true, configurable: true })
    Object.defineProperty(this, 'referrerPolicy', { value: init.referrerPolicy || '', writable: true, configurable: true })
    Object.defineProperty(this, 'signal', { value: init.signal || null, writable: true, configurable: true })
    this._cookies = new Map()
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    if (this.body) {
      return this.body
    }
    throw new Error('Request body is null or empty')
  }

  async text() {
    if (typeof this.body === 'string') {
      return this.body
    }
    if (this.body) {
      return JSON.stringify(this.body)
    }
    throw new Error('Request body is null or empty')
  }

  get cookies() {
    return {
      get: (name: string) => {
        const cookieHeader = this.headers.get('cookie') || ''
        const cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        return { name, value: cookies[name] }
      },
      set: (name: string, value: string) => {
        const existing = this.headers.get('cookie') || ''
        const cookies = existing ? existing.split(';').map((c: string) => c.trim()) : []
        const existingIndex = cookies.findIndex((c: string) => c.startsWith(`${name}=`))
        if (existingIndex >= 0) {
          cookies[existingIndex] = `${name}=${value}`
        } else {
          cookies.push(`${name}=${value}`)
        }
        this.headers.set('cookie', cookies.join('; '))
        this._cookies.set(name, value)
      },
      getAll: () => {
        const cookieHeader = this.headers.get('cookie') || ''
        return cookieHeader.split(';').map((cookie: string) => {
          const [key, value] = cookie.trim().split('=')
          return { name: key, value }
        })
      },
      delete: (name: string) => {
        const cookieHeader = this.headers.get('cookie') || ''
        const cookies = cookieHeader.split(';').filter((c: string) => !c.trim().startsWith(`${name}=`))
        this.headers.set('cookie', cookies.join('; '))
        this._cookies.delete(name)
      },
      has: (name: string) => this._cookies.has(name) || this.headers.get('cookie')?.includes(`${name}=`),
      clear: () => {
        this.headers.delete('cookie')
        this._cookies.clear()
      }
    }
  }

  clone() {
    const headersInit: Record<string, string> = {}
    this.headers.forEach((value: string, key: string) => {
      headersInit[key] = value
    })
    return new MockRequest(this.url, {
      method: this.method,
      headers: headersInit,
      body: this.body,
      cache: this.cache,
      credentials: this.credentials,
      integrity: this.integrity,
      keepalive: this.keepalive,
      mode: this.mode,
      redirect: this.redirect,
      referrer: this.referrer,
      referrerPolicy: this.referrerPolicy,
      signal: this.signal
    })
  }
}

class MockResponse {
  body!: any
  status!: number
  statusText!: string
  headers!: Headers
  ok!: boolean
  redirected!: boolean
  type!: string
  url!: string
  _cookies!: Map<any, any>
  constructor(body: any = null, init: any = {}) {
    Object.defineProperty(this, 'body', { value: body, writable: true, configurable: true })
    Object.defineProperty(this, 'status', { value: init.status || 200, writable: true, configurable: true })
    Object.defineProperty(this, 'statusText', { value: init.statusText || 'OK', writable: true, configurable: true })
    Object.defineProperty(this, 'headers', { value: new Headers(init.headers), writable: true, configurable: true })
    const ok = (init.status || 200) >= 200 && (init.status || 200) < 300
    Object.defineProperty(this, 'ok', { value: ok, writable: true, configurable: true })
    Object.defineProperty(this, 'redirected', { value: init.redirected || false, writable: true, configurable: true })
    Object.defineProperty(this, 'type', { value: init.type || 'default', writable: true, configurable: true })
    Object.defineProperty(this, 'url', { value: init.url || '', writable: true, configurable: true })
    this._cookies = new Map()
  }

  static json(data: any, init: any = {}) {
    return new MockResponse(JSON.stringify(data), { ...init, headers: init.headers })
  }

  get cookies() {
    return {
      get: (name: string) => {
        const cookieHeader = this.headers.get('set-cookie') || ''
        const cookies = cookieHeader.split(';').reduce((acc: any, cookie: string) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        return { name, value: cookies[name] }
      },
      set: (name: string, value: string) => {
        this._cookies.set(name, value)
      },
      getAll: () => {
        const cookieHeader = this.headers.get('set-cookie') || ''
        return cookieHeader.split(';').map((cookie: string) => {
          const [key, value] = cookie.trim().split('=')
          return { name: key, value }
        })
      },
      delete: (name: string) => this._cookies.delete(name),
      has: (name: string) => this._cookies.has(name),
      clear: () => this._cookies.clear()
    }
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body)
  }

  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body))
  }

  clone() {
    const headersInit: Record<string, string> = {}
    this.headers.forEach((value: string, key: string) => {
      headersInit[key] = value
    })
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: headersInit,
      url: this.url,
      type: this.type,
      redirected: this.redirected
    })
  }
}

Object.assign(global, { Request: MockRequest, Response: MockResponse, Headers })
