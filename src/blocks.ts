import fetch from 'node-fetch'
import consola from 'consola'
import ora from 'ora'
import { type MastodontConfig } from './types'

const endpoint = (config: MastodontConfig) => `${config.endpoint}/api/v1/admin/domain_blocks`

export const getBlocks = async (config: MastodontConfig, quiet: boolean) => {
  const spinner = ora('Querying instance blocks.')
  if (!quiet) spinner.start()
  const res = await fetch(endpoint(config), {
    headers: {
      Authorization: `Bearer ${config['access-token']}`
    }
  })

  if (!quiet) spinner.stopAndPersist()
  const blocks = await res.json()
  if (!quiet) consola.debug(`Domain blocks: ${JSON.stringify(blocks, null, 2)}`)

  if (res.status !== 200) {
    if (!quiet) spinner.fail()
    consola.debug(`Blocks query response: ${JSON.stringify(res, null, 2)}`)
    throw new Error('Failed to retrieve current domain blocks.')
  } else {
    if (!quiet) spinner.succeed()
    return blocks
  }
}

export const setBlocks = async (config: MastodontConfig) => {
  const currentBlocks = await getBlocks(config, false)
  const spinner = ora('Updating instance blocks.').start()
  const res = await fetch(endpoint(config), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config['access-token']}`,
      'Content-Type': 'application/json'
    }
  })
}

// domain
// severity - silence, suspend, noop
// reject_media
// reject_reports
// private_comment
// public_comment
// obfuscate
