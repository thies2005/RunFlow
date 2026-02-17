export const CURRENT_API_VERSION = 'v1'
export const SUPPORTED_VERSIONS = ['v1']

export function getApiVersion(request: Request): string {
  const versionHeader = request.headers.get('API-Version')
  
  if (versionHeader && SUPPORTED_VERSIONS.includes(versionHeader)) {
    return versionHeader
  }
  
  return CURRENT_API_VERSION
}

export function setApiVersionHeaders(headers: Headers, version?: string): void {
  headers.set('API-Version', version || CURRENT_API_VERSION)
  headers.set('API-Supported', SUPPORTED_VERSIONS.join(','))
}

export function isDeprecatedVersion(version: string): boolean {
  return !SUPPORTED_VERSIONS.includes(version)
}

export function getVersionFromPath(pathname: string): string | null {
  const match = pathname.match(/\/api\/(v\d+)/)
  return match ? match[1] : null
}
