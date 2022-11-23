import { homedir } from 'os'
import path from 'path'
import { readFile, unlink, writeFile } from 'fs/promises'
import { parse as yaml, stringify as yamlStringify } from 'yaml'
import consola from 'consola'
import prompts, { type PromptObject } from 'prompts'
import ora from 'ora'
import { MastodontArgs, MastodontConfig } from './types'

const defaultConfigPath = path.join(homedir(), '.mastodont.yml')
const redact = (str: string) => str.replace(/./g, '*')

const interactivePrompts = async (config: MastodontConfig, flags: MastodontArgs) => {
  try {
    const questions: Record<string, PromptObject> = {
      endpoint: {
        type: 'text',
        name: 'value',
        initial: config.endpoint || '',
        message: 'Mastodon server URL:'
      },
      accessToken: {
        type: 'password',
        name: 'value',
        initial: config.accessToken || '',
        message: 'Mastodon access token:'
      },
      rejectMedia: {
        type: 'confirm',
        name: 'value',
        initial: config.rejectMedia || false,
        message: 'Reject media from imported domains?'
      },
      rejectReports: {
        type: 'confirm',
        name: 'value',
        initial: config.rejectReports || false,
        message: 'Reject reports from imported domains?'
      },
      obfuscate: {
        type: 'confirm',
        name: 'value',
        initial: config.obfuscate || false,
        message: 'Obfuscate domains in public blocklist?'
      },
      severity: {
        type: 'select',
        name: 'value',
        choices: [
          { title: 'silence', value: 'silence' },
          { title: 'suspend', value: 'suspend' },
          {
            title: 'noop',
            value: 'noop'
          }
        ],
        message: 'Block severity:'
      }
    }

    let changed = false
    for (const key of Object.keys(questions)) {
      consola.debug(`config.${key}: ${config[key]}, flag.${key}: ${flags[key]}`)
      if (config[key] === undefined && !flags[key]) {
        config[key] = (await prompts(questions[key]))?.value
        changed = true
      } else {
        config[key] = flags[key] || config[key]
      }
    }

    if (!flags.publicComment) {
      config.publicComment = (
        await prompts({
          type: 'text',
          name: 'value',
          initial: '',
          message: 'Public comment:'
        })
      )?.value
    }

    if (!flags.privateComment) {
      config.privateComment = (
        await prompts({
          type: 'text',
          name: 'value',
          initial: `Imported by Mastodont on ${new Date().toISOString()}`,
          message: 'Private comment:'
        })
      )?.value
    }

    if (changed && !flags.save) {
      config.save = (
        await prompts({
          type: 'confirm',
          name: 'value',
          initial: false,
          message: `Save config to ${defaultConfigPath}?`
        })
      ).value
    }

    return config
  } catch (e) {
    consola.error(e)
    process.exit(1)
  }
}

export const getConfig = async (flags: MastodontArgs): Promise<MastodontConfig> => {
  const spinner = ora('Loading config.').start()
  let config: MastodontConfig = {}

  // check if yml file exists else use default
  if (flags.config) {
    try {
      config = yaml(await readFile(flags.config, 'utf-8'))
      spinner.succeed()
    } catch (e) {
      spinner.fail()
      consola.error(`Config file not found at \`${flags.config}\`.`)
      process.exit(1)
    }
  } else {
    try {
      config = yaml(await readFile(defaultConfigPath, 'utf-8'))
      spinner.succeed()
    } catch (e) {
      spinner.stopAndPersist({ text: `Default config file not found.` })
    }
  }

  if (!flags.nonInteractive) {
    spinner.stop()
    config = await interactivePrompts(config, flags)
  }

  if (config && (!config.endpoint?.length || !config.accessToken?.length)) {
    throw new Error('Mastodon server URL and access token are required.')
  }

  const debugConfig = { ...config }
  debugConfig.accessToken = redact(<string>config.accessToken)
  consola.debug(`Config: ${JSON.stringify(debugConfig, null, 2)}`)

  return config
}

export const setConfig = async (config: MastodontConfig): Promise<void> => {
  const spinner = ora(`Writing config to \`${defaultConfigPath}\`.`).start()
  try {
    delete config.blocklist
    delete config.config
    delete config.save
    delete config.reset
    delete config.publicComment
    delete config.privateComment
    delete config.nonInteractive
    spinner.stopAndPersist()
    const yamlConfig = yamlStringify(config)
    consola.debug(`Writing config:\n${yamlConfig}`)
    await writeFile(defaultConfigPath, yamlConfig)
    spinner.succeed()
  } catch (e) {
    spinner.fail()
    throw new Error(`Unable to write config file: ${(<Error>e).message}`)
  }
}

export const resetConfig = async (): Promise<void> => {
  const spinner = ora(`Resetting config.`).start()
  try {
    await unlink(defaultConfigPath)
    spinner.succeed()
    consola.debug(`Config file successfully deleted.`)
    process.exit(0)
  } catch (e) {
    spinner.fail()
    throw new Error(`Unable to reset config file: ${(<Error>e).message}`)
  }
}
