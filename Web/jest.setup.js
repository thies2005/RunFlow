import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

Object.assign(global, { TextDecoder, TextEncoder })

class MockRequest {
  constructor(input, init = {}) {
    const urlStr = typeof input === 'string' ? input : input.url
    Object.defineProperty(this, 'url', {
      value: urlStr,
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'method', {
      value: init.method || 'GET',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'headers', {
      value: new Headers(init.headers),
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'body', {
      value: init.body || null,
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'cache', {
      value: init.cache || 'default',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'credentials', {
      value: init.credentials || 'same-origin',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'integrity', {
      value: init.integrity || '',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'keepalive', {
      value: init.keepalive || false,
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'mode', {
      value: init.mode || 'cors',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'redirect', {
      value: init.redirect || 'follow',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'referrer', {
      value: init.referrer || 'about:client',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'referrerPolicy', {
      value: init.referrerPolicy || '',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'signal', {
      value: init.signal || null,
      writable: false,
      configurable: false,
      enumerable: true
    })
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
      get: (name) => {
        const cookieHeader = this.headers.get('cookie') || ''
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        return { name, value: cookies[name] }
      },
      set: (name, value) => {
        const existing = this.headers.get('cookie') || ''
        const cookies = existing ? existing.split(';').map(c => c.trim()) : []
        const existingIndex = cookies.findIndex(c => c.startsWith(`${name}=`))
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
        return cookieHeader.split(';').map(cookie => {
          const [key, value] = cookie.trim().split('=')
          return { name: key, value }
        })
      },
      delete: (name) => {
        const cookieHeader = this.headers.get('cookie') || ''
        const cookies = cookieHeader.split(';').filter(c => !c.trim().startsWith(`${name}=`))
        this.headers.set('cookie', cookies.join('; '))
        this._cookies.delete(name)
      },
      has: (name) => this._cookies.has(name) || this.headers.get('cookie')?.includes(`${name}=`),
      clear: () => {
        this.headers.delete('cookie')
        this._cookies.clear()
      }
    }
  }

  clone() {
    const headersInit = {}
    this.headers.forEach((value, key) => {
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
  constructor(body = null, init = {}) {
    Object.defineProperty(this, 'body', {
      value: body,
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'status', {
      value: init.status || 200,
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'statusText', {
      value: init.statusText || 'OK',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'headers', {
      value: new Headers(init.headers),
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'ok', {
      value: this.status >= 200 && this.status < 300,
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'redirected', {
      value: init.redirected || false,
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'type', {
      value: init.type || 'default',
      writable: false,
      configurable: false,
      enumerable: true
    })
    Object.defineProperty(this, 'url', {
      value: init.url || '',
      writable: false,
      configurable: false,
      enumerable: true
    })
    this._cookies = new Map()
  }

  static json(data, init = {}) {
    return new MockResponse(JSON.stringify(data), { ...init, headers: init.headers })
  }

  get cookies() {
    return {
      get: (name) => {
        const cookieHeader = this.headers.get('set-cookie') || ''
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=')
          acc[key] = value
          return acc
        }, {})
        return { name, value: cookies[name] }
      },
      set: (name, value) => {
        this._cookies.set(name, value)
      },
      getAll: () => {
        const cookieHeader = this.headers.get('set-cookie') || ''
        return cookieHeader.split(';').map(cookie => {
          const [key, value] = cookie.trim().split('=')
          return { name: key, value }
        })
      },
      delete: (name) => this._cookies.delete(name),
      has: (name) => this._cookies.has(name),
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
    const headersInit = {}
    this.headers.forEach((value, key) => {
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
