export interface MastodontArgs {
  accessToken?: string
  nonInteractive?: boolean
  privateComment?: string
  publicComment?: string
  rejectMedia?: boolean
  rejectReports?: boolean
  blocklist?: string
  config?: string
  endpoint?: string
  obfuscate?: boolean
  reset?: boolean
  save?: boolean
  severity?: string
}

export type MastodontConfig = MastodontArgs

export interface Block {
  id: string
  domain: string
  created_at: string
  severity: string
  reject_media: boolean
  reject_reports: boolean
  private_comment?: null
  public_comment?: null
  obfuscate: boolean
}
