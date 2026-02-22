import { consola } from 'consola';
import isUrl from 'is-url-superb';
import fetch from 'node-fetch';
import ora from 'ora';
import { getBlocks } from './blocks.js';
import type { MastodontConfig } from './types/index.js';
import type { MastodonInstance } from './types/validations.js';

export const validateEndpoint = async (config: MastodontConfig) => {
  const spinner = ora('Validating endpoint.').start();
  if (config.endpoint && !isUrl(config.endpoint)) {
    spinner.fail();
    throw new Error('Mastodon server URL is invalid.');
  } else {
    const res = await fetch(`${config.endpoint}/api/v2/instance`);
    if (res.status !== 200) {
      spinner.fail();
      throw new Error('Mastodon server URL is invalid.');
    } else {
      // validate api endpoint exists and uses v4+
      const instance = (await res.json()) as MastodonInstance;
      const majorVersion = parseInt(instance?.version?.split('.')[0] ?? '', 10);
      if (isNaN(majorVersion) || majorVersion < 4) {
        spinner.fail();
        throw new Error('Mastodon version 4 or higher required.');
      } else {
        spinner.succeed();
        consola.debug('Successfully validated Mastodon version.');
      }
      return instance;
    }
  }
};

export const validateCredentials = async (config: MastodontConfig) => {
  const spinner = ora('Validating credentials.').start();
  try {
    await getBlocks(config, true);
    spinner.succeed();
  } catch {
    spinner.fail();
    throw new Error('Failed to authenticate to API. Access token is likely invalid.');
  }
};
