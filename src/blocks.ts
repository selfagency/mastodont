import { consola } from 'consola';
import { readFile } from 'fs/promises';
import isUrl from 'is-url-superb';
import fetch, { type Response } from 'node-fetch';
import ora from 'ora';
import { type Block, type MastodontConfig } from './types/index.js';

const BATCH_SIZE = 10;

const apiEndpoint = (config: MastodontConfig) => `${config.endpoint}/api/v1/admin/domain_blocks`;

const authHeaders = (config: MastodontConfig) => ({
  Authorization: `Bearer ${config.accessToken}`,
});

const parseLinkHeader = (header: string | null): string | null => {
  if (!header) return null;
  const match = header.match(/<([^>]+)>;\s*rel="next"/);
  return match?.[1] ?? null;
};

export const getBlocks = async (config: MastodontConfig, quiet: boolean): Promise<Block[]> => {
  let spinner: ReturnType<typeof ora> | undefined;
  if (!quiet) {
    spinner = ora('Querying instance blocks.').start();
  }

  const allBlocks: Block[] = [];
  let url: string | null = apiEndpoint(config);

  while (url) {
    const res: Response = await fetch(url, {
      headers: authHeaders(config),
    });

    if (res.status !== 200) {
      if (spinner) spinner.fail();
      consola.debug(`Blocks query response status: ${res.status}`);
      throw new Error('Failed to retrieve current domain blocks.');
    }

    const blocks = (await res.json()) as Block[];
    allBlocks.push(...blocks);

    url = parseLinkHeader(res.headers.get('link'));
  }

  if (spinner) {
    spinner.succeed();
    consola.debug(`Domain blocks: ${allBlocks.length} total`);
  }

  return allBlocks;
};

export const setBlocks = async (config: MastodontConfig) => {
  const currentBlocks = await getBlocks(config, false);
  const spinner = ora('Updating instance blocks.').start();

  let blocklist: string[] = [];
  try {
    if (!config?.blocklist) {
      throw new Error('No blocklist specified.');
    }

    if (isUrl(config.blocklist)) {
      blocklist = (await (await fetch(config.blocklist)).text()).split(/\r?\n/);
    } else {
      blocklist = (await readFile(config.blocklist, 'utf8')).split('\n');
    }
  } catch (e) {
    spinner.fail();
    consola.error(`Failed to load blocklist: ${(e as Error).message}`);
    process.exit(1);
  }

  // Filter out empty lines and whitespace-only entries
  blocklist = blocklist.map(d => d.trim()).filter(d => d.length > 0);

  const currentDomains = new Set(currentBlocks.map(block => block.domain));
  const blocksToAdd = blocklist.filter(domain => !currentDomains.has(domain));

  if (blocksToAdd.length === 0) {
    spinner.succeed('No new domains to block.');
    process.exit(0);
  }

  const url = apiEndpoint(config);
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < blocksToAdd.length; i += BATCH_SIZE) {
    const batch = blocksToAdd.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(domain => {
      const body = new URLSearchParams({
        domain,
        severity: config.severity || 'silence',
        obfuscate: String(config.obfuscate || false),
      });

      if (config.severity !== 'suspend') {
        body.set('reject_media', String(config.rejectMedia || false));
        body.set('reject_reports', String(config.rejectReports || false));
      }

      if (config.privateComment) {
        body.set('private_comment', config.privateComment);
      }

      if (config.publicComment) {
        body.set('public_comment', config.publicComment);
      }

      return fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders(config),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
    });

    try {
      const results = await Promise.all(batchPromises);
      for (const res of results) {
        if (res.status >= 200 && res.status < 300) {
          succeeded++;
        } else if (res.status === 422) {
          // Domain already blocked, skip silently
          consola.debug(`Domain already blocked (422), skipping`);
        } else {
          failed++;
          consola.debug(`Failed to block domain: HTTP ${res.status}`);
        }
      }
    } catch (e) {
      spinner.fail();
      consola.error(`Error adding blocks: ${(e as Error).message}`);
      process.exit(1);
    }

    spinner.text = `Updating instance blocks. (${Math.min(i + BATCH_SIZE, blocksToAdd.length)}/${blocksToAdd.length})`;
  }

  if (failed > 0) {
    spinner.warn(`Completed with errors: ${succeeded} succeeded, ${failed} failed.`);
  } else {
    spinner.succeed(`Successfully blocked ${succeeded} domains.`);
  }
};
