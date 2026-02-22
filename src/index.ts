import { consola } from 'consola';
import open from 'open';
import { args } from './args.js';
import { setBlocks, removeBlocks } from './blocks.js';
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

    // process blocklist or remove blocks
    if (config.allowlist && !config.blocklist) {
      await removeBlocks(config);
    } else {
      await setBlocks(config);
    }

    // open browser
    if (!flags.nonInteractive) {
      const url = `${config.endpoint}/admin/instances?limited=1`;
      consola.info('Opening browser to instance blocklist...');
      try {
        await open(url);
      } catch {
        consola.warn(`Could not open browser. Visit the blocklist manually: ${url}`);
      }
    }
  }
};

main().catch(e => consola.error((e as Error).message));
