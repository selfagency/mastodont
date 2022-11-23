interface Object {
  hasOwnProperty<T>(this: T, v: any): v is keyof T
}

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
