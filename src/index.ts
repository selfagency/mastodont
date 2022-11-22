import { type Args, parse, string, flag } from '@thi.ng/args'
import { type MastodontArgs } from './index.d'

  // "@thi.ng/args": "^2.2.8",
  // "boxen": "^7.0.0",
  // "chalk": "^5.1.2",
  // "got": "^12.5.3",
  // "open": "^8.4.0",
  // "ora": "^6.1.2",
  // "prompts": "^2.4.2",
  // "yaml": "^2.1.3"

let debug = false;

const specs: Args<MastodontArgs> = {
  // string arg
  config: string({
    alias: "c",
    hint: "PATH",
    desc: "Config file path (overridden by flags)",
  }),
  debug: flag({
    alias: "d",
    desc: "Debug",
    fn: (_) => (debug = true),
  }),
  blocklist: string({
    alias: "b",
    hint: "PATH",
    desc: "Blocklist file path",
  }),
  endpoint: string({
    alias: "e",
    hint: "URL",
    desc: "Mastodon API endpoint",
  }),
  "api-key": string({
    alias: "k",
    hint: "KEY",
    desc: "Mastodon API key",
  })
};

try {
  const args = parse(specs, process.argv);
  console.log(args);
} catch (e) {
  console.error(e);
}

// check if flags are set
// check if yml file exists else
// request api endpoint
// request api key
// validate api endpoint exists and uses v4+
// save to yml
// request blocklist file path
// validate blocklist file exists
// process blocklist
