import fetch from 'node-fetch'
import consola from 'consola'
import ora from 'ora'
import { type Block, type MastodontConfig } from './types'
import { readFile } from 'fs/promises'

const endpoint = (config: MastodontConfig) => `${config.endpoint}/api/v1/admin/domain_blocks`

export const getBlocks = async (config: MastodontConfig, quiet: boolean): Promise<Block[]> => {
  const spinner = ora('Querying instance blocks.')
  if (!quiet) spinner.start()
  const res = await fetch(endpoint(config), {
    headers: {
      Authorization: `Bearer ${config.accessToken}`
    }
  })

  if (!quiet) spinner.stopAndPersist()
  const blocks = <Block[]>await res.json()
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

  let blocklist: string[] = []
  try {
    if (!config?.blocklist) {
      throw new Error('No blocklist file specified.')
    }

    blocklist = (await readFile(<string>config?.blocklist, 'utf8')).split('\n')
  } catch (e) {
    spinner.fail()
    consola.error(`Failed to read blocklist file: ${(<Error>e).message}`)
    process.exit(1)
  }

  const blocksToAdd = blocklist.filter(domain => !currentBlocks.map(block => block.domain).includes(domain))

  if (blocksToAdd.length === 0) {
    spinner.succeed('No new domains to block.')
    process.exit(0)
  }

  const baseUrl =
    `${endpoint(config)}?` +
    `&severity=${config.severity}` +
    (config.severity !== 'suspend'
      ? `&reject_media=${config.rejectMedia}` + `&reject_reports=${config.rejectReports}`
      : '') +
    `&obfuscate=${config.obfuscate}` +
    `&private_comments=${config.privateComment}` +
    `&public_comment=${config.publicComment}`

  const blocksToAddPromises = blocksToAdd.map(domain =>
    fetch(`${baseUrl}&domain=${domain}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`
      }
    })
  )

  try {
    await Promise.all(blocksToAddPromises)
    spinner.succeed()
  } catch (e) {
    spinner.fail()
    consola.error(`Error adding blocks: ${(<Error>e).message}`)
    process.exit(1)
  }
}
