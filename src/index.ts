import { consola } from 'consola';
import open from 'open';
import { args } from './args.js';
import { setBlocks } from './blocks.js';
import { getConfig, resetConfig, setConfig } from './config.js';
import { header } from './header.js';
import { validateCredentials, validateEndpoint } from './validations.js';

const main = async (): Promise<void> => {
  consola.log(header);

  // check if flags are set
  const flags = await args();

  if (flags) {
    // reset config
    if (flags?.reset) {
      await resetConfig();
    }

    // get config
    const config = await getConfig(flags);

    // validate config
    const instance = await validateEndpoint(config);

    // validate credentials
    await validateCredentials(config);

    // save config to yml
    if (instance && config?.save) {
      await setConfig(config);
    }

    // process blocklist
    await setBlocks(config);

    // open browser
    if (!flags.nonInteractive) {
      consola.info('Opening browser to instance blocklist...');
      await open(`${config.endpoint}/admin/instances?limited=1`);
    }
  }
};

main().catch(e => consola.error((e as Error).message));
