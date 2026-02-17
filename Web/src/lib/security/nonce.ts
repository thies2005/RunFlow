export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...Array.from(array)))
  }

  const cryptoModule = require('crypto')
  return cryptoModule.randomBytes(16).toString('base64')
}
