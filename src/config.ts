import { homedir } from 'os'
import path from 'path'
import { readFile, writeFile } from 'fs/promises'
import { parse as yaml, stringify as yamlStringify } from 'yaml'
import consola from 'consola'
import prompts from 'prompts'
import ora from 'ora'
import { MastodontConfig } from './types'

const defaultConfigPath = path.join(homedir(), '.mastodont.yml')
const redact = (str: string) => str.replace(/./g, '*')

export const getConfig = async (configPath?: string): Promise<MastodontConfig> => {
  const spinner = ora('Loading config.').start()
  let config: MastodontConfig = {}

  // check if yml file exists else use default
  if (configPath) {
    try {
      config = yaml(await readFile(configPath, 'utf-8'))
    } catch (e) {
      spinner.fail()
      consola.error(`Config file not found at \`${configPath}\`.`)
      process.exit(1)
    }
  } else {
    try {
      config = yaml(await readFile(defaultConfigPath, 'utf-8'))
    } catch (e) {
      spinner.stopAndPersist({ text: `Default config file not found.` })
    }
  }

  // if no config, prompt for endpoint and access token
  if (!config.endpoint || !config['access-token']) {
    spinner.stop()

    try {
      // request api endpoint
      const endpoint = await prompts({
        type: 'text',
        name: 'endpoint',
        initial: config.endpoint || '',
        message: 'Mastodon server URL:'
      })

      // request access token
      const accessToken = await prompts({
        type: 'password',
        name: 'accessToken',
        initial: config['access-token'] || '',
        message: 'Mastodon access token:'
      })

      config = {
        endpoint: endpoint.endpoint,
        'access-token': accessToken.accessToken
      }

      if (config && (!config.endpoint?.length || !config['access-token']?.length)) {
        throw new Error('Mastodon server URL and access token are required.')
      }
    } catch (e) {
      consola.error(e)
      process.exit(1)
    }
  } else {
    spinner.succeed()
  }

  const debugConfig = { ...config }
  debugConfig['access-token'] = redact(<string>config['access-token'])
  consola.debug(`Config: ${JSON.stringify(debugConfig, null, 2)}`)

  return config
}

export const setConfig = async (config: MastodontConfig): Promise<void> => {
  const spinner = ora(`Writing config to \`${defaultConfigPath}\`.`).start()
  try {
    await writeFile(defaultConfigPath, yamlStringify(config))
    spinner.succeed()
  } catch (e) {
    spinner.fail()
    throw new Error(`Unable to write config file: ${(<Error>e).message}`)
  }
}
