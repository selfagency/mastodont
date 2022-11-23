import { type Args, flag, parse, string } from '@thi.ng/args'
import consola from 'consola'
import { type MastodontArgs } from './types'

const specs: Args<MastodontArgs> = {
  'access-token': string({
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
    desc: 'Config file path (default is ~/.mastodont.yml)'
  }),
  endpoint: string({
    alias: 'e',
    hint: 'URL',
    desc: 'Mastodon server URL'
  }),
  reset: flag({
    desc: 'Reset config'
  }),
  'reject-media': flag({
    desc: 'Reject media from domains'
  }),
  'reject-reports': flag({
    desc: 'Reject reports from domains'
  }),
  severity: string({
    alias: 's',
    hint: 'LEVEL',
    desc: 'Block severity level (silence, suspend, noop)'
  }),
  obfuscate: flag({
    desc: 'Obfuscate domains in public comment'
  }),
  'private-comment': string({
    hint: 'COMMENT',
    desc: 'Private comment'
  }),
  'public-comment': string({
    hint: 'COMMENT',
    desc: 'Public comment'
  })
}

export const args = async () => {
  const args = parse(specs, process.argv)
  consola.debug(`Arguments: ${JSON.stringify(args?.result, null, 2)}`)
  return args
}
