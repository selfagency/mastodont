export interface MastodontArgs {
  'access-token'?: string
  'private-comment'?: string
  'public-comment'?: string
  'reject-media'?: boolean
  'reject-reports'?: boolean
  blocklist?: string
  config?: string
  endpoint?: string
  obfuscate?: boolean
  reset?: boolean
  severity?: string
}

export interface MastodontConfig {
  'access-token'?: string
  endpoint?: string
}
