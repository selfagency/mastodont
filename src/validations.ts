import isUrl from 'is-url-superb'
import fetch from 'node-fetch'
import consola from 'consola'
import { getBlocks } from './blocks'
import { MastodonInstance } from './types/validations'
import ora from 'ora'
import { MastodontConfig } from './types'

export const validateEndpoint = async (config: MastodontConfig) => {
  const spinner = ora('Validating endpoint.').start()
  if (config.endpoint && !isUrl(config.endpoint)) {
    spinner.fail()
    throw new Error('Mastodon server URL is invalid.')
  } else {
    const res = await fetch(`${config.endpoint}/api/v2/instance`)
    if (res.status !== 200) {
      spinner.fail()
      throw new Error('Mastodon server URL is invalid.')
    } else {
      // validate api endpoint exists and uses v4+
      const instance = <MastodonInstance>await res.json()
      if (!instance?.version.startsWith('4.')) {
        spinner.fail()
        throw new Error('Mastodon version 4 or higher required.')
      } else {
        spinner.succeed()
        consola.debug('Successfully validated Mastodon version.')
      }
      return instance
    }
  }
}

export const validateCredentials = async (config: MastodontConfig) => {
  const spinner = ora('Validating credentials.').start()
  try {
    await getBlocks(config, true)
    spinner.succeed()
  } catch (e) {
    spinner.fail()
    throw new Error('Failed to authenticate to API. Access token is likely invalid.')
  }
}
