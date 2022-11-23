import { type Args, flag, parse, string } from '@thi.ng/args'
import consola from 'consola'
import { type MastodontArgs } from './types'

const specs: Args<MastodontArgs> = {
  accessToken: string({
    alias: 't',
    hint: 'TOKEN',
    desc: 'Mastodon Access Token'
  }),
  blocklist: string({
    alias: 'b',
    hint: 'PATH',
    desc: 'Blocklist file path'
  }),
  config: string({
    alias: 'c',
    hint: 'PATH',
    desc: 'Custom config file path'
  }),
  endpoint: string({
    alias: 'e',
    hint: 'URL',
    desc: 'Mastodon server URL'
  }),
  reset: flag({
    desc: 'Reset config (cannot be used with other options)'
  }),
  save: flag({
    desc: 'Save config to default location'
  }),
  rejectMedia: flag({
    desc: 'Reject media from domains (works with `limit`, `noop`)'
  }),
  rejectReports: flag({
    desc: 'Reject reports from domains (works with `limit`, `noop`)'
  }),
  severity: string({
    alias: 's',
    hint: 'LEVEL',
    desc: 'Block severity level (silence, suspend, noop)'
  }),
  obfuscate: flag({
    desc: 'Obfuscate domains in public comment'
  }),
  privateComment: string({
    hint: 'COMMENT',
    desc: 'Private comment'
  }),
  publicComment: string({
    hint: 'COMMENT',
    desc: 'Public comment'
  }),
  nonInteractive: flag({
    desc: 'Disable interactive mode'
  })
}

export const args = async () => {
  const args = parse(specs, process.argv)
  consola.debug(`Arguments: ${JSON.stringify(args?.result, null, 2)}`)
  return args?.result
}
