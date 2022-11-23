import consola from 'consola'
import { getConfig, resetConfig, setConfig } from './config'
import { args } from './args'
import { validateCredentials, validateEndpoint } from './validations'

// "boxen": "^7.0.0",
// "open": "^8.4.0",

const main = async () => {
  // check if flags are set
  const flags = await args()

  if (flags) {
    // reset config
    if (flags?.reset) {
      await resetConfig()
    }

    // get config
    const config = await getConfig(flags)

    // validate config
    const instance = await validateEndpoint(config)

    // validate credentials
    await validateCredentials(config)

    // save config to yml
    if (instance && config?.save) {
      await setConfig(config)
    }
  }
}

// request blocklist file path
// validate blocklist file exists
// process blocklist

main().catch(e => consola.error(<Error>e.message))
