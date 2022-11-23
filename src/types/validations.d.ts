import { MastodontConfig } from './index'

export interface Users {
  active_month: number
}

export interface Usage {
  users: Users
}

export interface Versions {
  '@1x': string
  '@2x': string
}

export interface Thumbnail {
  url: string
  blurhash: string
  versions: Versions
}

export interface Urls {
  streaming: string
}

export interface Accounts {
  max_featured_tags: number
}

export interface Statuses {
  max_characters: number
  max_media_attachments: number
  characters_reserved_per_url: number
}

export interface MediaAttachments {
  supported_mime_types?: string[] | null
  image_size_limit: number
  image_matrix_limit: number
  video_size_limit: number
  video_frame_rate_limit: number
  video_matrix_limit: number
}

export interface Polls {
  max_options: number
  max_characters_per_option: number
  min_expiration: number
  max_expiration: number
}

export interface Translation {
  enabled: boolean
}

export interface Registrations {
  enabled: boolean
  approval_required: boolean
  message?: null
}

export interface FieldsEntity {
  name: string
  value: string
  verified_at?: null
}

export interface RulesEntity {
  id: string
  text: string
}

export interface Account {
  id: string
  username: string
  acct: string
  display_name: string
  locked: boolean
  bot: boolean
  discoverable: boolean
  group: boolean
  created_at: string
  note: string
  url: string
  avatar: string
  avatar_static: string
  header: string
  header_static: string
  followers_count: number
  following_count: number
  statuses_count: number
  last_status_at: string
  noindex: boolean
  emojis?: null[] | null
  fields?: FieldsEntity[] | null
}

export interface Contact {
  email: string
  account: Account
}

export interface Configuration {
  urls: Urls
  accounts: Accounts
  statuses: Statuses
  media_attachments: MediaAttachments
  polls: Polls
  translation: Translation
}

export interface MastodonInstance {
  domain: string
  title: string
  version: string
  source_url: string
  description: string
  usage: Usage
  thumbnail: Thumbnail
  languages?: string[] | null
  configuration: Configuration
  registrations: Registrations
  contact: Contact
  rules?: RulesEntity[] | null
}

declare namespace validations {
  export function validateEndpoint(config: MastodontConfig): Promise<MastodonInstanec>
}
