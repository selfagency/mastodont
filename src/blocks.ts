import { consola } from 'consola';
import { readFile } from 'fs/promises';
import isUrl from 'is-url-superb';
import fetch, { type Response } from 'node-fetch';
import ora from 'ora';
import { type Block, type MastodontConfig } from './types/index.js';

const BATCH_SIZE = 10;

export const loadDomainList = async (source: string): Promise<string[]> => {
  let raw: string;

  if (isUrl(source)) {
    raw = await (await fetch(source)).text();
  } else {
    raw = await readFile(source, 'utf8');
  }

  const ext = source.split('?')[0]!.toLowerCase();

  if (ext.endsWith('.json')) {
    const parsed = JSON.parse(raw) as string[];
    return parsed.map(d => d.trim()).filter(d => d.length > 0);
  }

  if (ext.endsWith('.csv')) {
    return raw
      .split(/\r?\n/)
      .map(line => line.split(',')[0]!.trim())
      .filter((d, i) => d.length > 0 && !(i === 0 && d.toLowerCase() === 'domain'));
  }

  // Default: plain text, one domain per line
  return raw
    .split(/\r?\n/)
    .map(d => d.trim())
    .filter(d => d.length > 0);
};

const apiEndpoint = (config: MastodontConfig) => `${config.endpoint}/api/v1/admin/domain_blocks`;

const authHeaders = (config: MastodontConfig) => ({
  Authorization: `Bearer ${config.accessToken}`,
});

const parseLinkHeader = (header: string | null): string | null => {
  // Avoid using a complex regex to prevent any risk of catastrophic backtracking.
  // Instead perform a linear scan using index/substring operations which are
  // O(n) and not vulnerable to backtracking DoS.
  if (!header) return null;

  const REL_NEXT = 'rel="next"';
  let searchIndex = 0;

  while (true) {
    const relIndex = header.indexOf(REL_NEXT, searchIndex);
    if (relIndex === -1) return null;

    // Find the nearest preceding '<' and following '>' that enclose the URL
    const lt = header.lastIndexOf('<', relIndex);
    if (lt === -1) {
      // Move past this rel token and keep searching
      searchIndex = relIndex + REL_NEXT.length;
      continue;
    }

    const gt = header.indexOf('>', lt);
    // Ensure the closing '>' exists and comes before the rel token
    if (gt === -1 || gt > relIndex) {
      searchIndex = relIndex + REL_NEXT.length;
      continue;
    }

    return header.slice(lt + 1, gt);
  }
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

    blocklist = await loadDomainList(config.blocklist);
  } catch (e) {
    spinner.fail();
    consola.error(`Failed to load blocklist: ${(e as Error).message}`);
    process.exit(1);
  }

  let allowedDomains = new Set<string>();
  if (config.allowlist) {
    try {
      const allowlist = await loadDomainList(config.allowlist);
      allowedDomains = new Set(allowlist);
    } catch (e) {
      spinner.fail();
      consola.error(`Failed to load allowlist: ${(e as Error).message}`);
      process.exit(1);
    }
  }

  const currentDomains = new Set(currentBlocks.map(block => block.domain));
  const blocksToAdd = blocklist.filter(domain => !currentDomains.has(domain) && !allowedDomains.has(domain));
  const blocksToUpdate = currentBlocks.filter(
    block => blocklist.includes(block.domain) && !allowedDomains.has(block.domain),
  );

  const url = apiEndpoint(config);
  let succeeded = 0;
  let failed = 0;

  // If there is nothing to add or update, exit early
  if (blocksToAdd.length === 0 && !(config.update && blocksToUpdate.length > 0)) {
    spinner.succeed('No new domains to block.');
    process.exit(0);
  }

  // Helper to build the form body for a given domain
  const buildBody = (domain: string) => {
    const body = new URLSearchParams({
      domain,
      severity: config.severity || 'silence',
      obfuscate: String(config.obfuscate || false),
    });

    if (config.severity !== 'suspend') {
      body.set('reject_media', String(config.rejectMedia || false));
      body.set('reject_reports', String(config.rejectReports || false));
    }

    const marker = '[import-mastodont]';
    body.set('private_comment', config.privateComment ? `${marker} ${config.privateComment}` : marker);

    if (config.publicComment) {
      body.set('public_comment', config.publicComment);
    }

    return body;
  };

  // First: update existing blocks if requested
  if (config.update) {
    for (let i = 0; i < blocksToUpdate.length; i += BATCH_SIZE) {
      const batch = blocksToUpdate.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(block => {
        const body = buildBody(block.domain);
        return fetch(`${url}/${block.id}`, {
          method: 'PATCH',
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
          } else {
            failed++;
            consola.debug(`Failed to update block: HTTP ${res.status}`);
          }
        }
      } catch (e) {
        spinner.fail();
        consola.error(`Error updating blocks: ${(e as Error).message}`);
        process.exit(1);
      }

      spinner.text = `Updating instance blocks (update). (${Math.min(i + BATCH_SIZE, blocksToUpdate.length)}/${blocksToUpdate.length})`;
    }
  }

  // Then: add any new blocks
  for (let i = 0; i < blocksToAdd.length; i += BATCH_SIZE) {
    const batch = blocksToAdd.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(domain =>
      fetch(url, {
        method: 'POST',
        headers: {
          ...authHeaders(config),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: buildBody(domain).toString(),
      }),
    );

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
    spinner.succeed(`Successfully blocked/updated ${succeeded} domains.`);
  }
};

export const removeBlocks = async (config: MastodontConfig) => {
  const currentBlocks = await getBlocks(config, false);
  const spinner = ora('Removing domain blocks.').start();

  let domainsToRemove: string[] = [];
  try {
    if (!config?.allowlist) {
      throw new Error('No allowlist specified.');
    }

    domainsToRemove = await loadDomainList(config.allowlist);
  } catch (e) {
    spinner.fail();
    consola.error(`Failed to load allowlist: ${(e as Error).message}`);
    process.exit(1);
  }

  const domainSet = new Set(domainsToRemove);
  const blocksToRemove = currentBlocks.filter(block => domainSet.has(block.domain));

  if (blocksToRemove.length === 0) {
    spinner.succeed('No matching domain blocks to remove.');
    return;
  }

  const url = apiEndpoint(config);
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < blocksToRemove.length; i += BATCH_SIZE) {
    const batch = blocksToRemove.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map(block =>
      fetch(`${url}/${block.id}`, {
        method: 'DELETE',
        headers: authHeaders(config),
      }),
    );

    try {
      const results = await Promise.all(batchPromises);
      for (const res of results) {
        if (res.status >= 200 && res.status < 300) {
          succeeded++;
        } else {
          failed++;
          consola.debug(`Failed to remove block: HTTP ${res.status}`);
        }
      }
    } catch (e) {
      spinner.fail();
      consola.error(`Error removing blocks: ${(e as Error).message}`);
      process.exit(1);
    }

    spinner.text = `Removing domain blocks. (${Math.min(i + BATCH_SIZE, blocksToRemove.length)}/${blocksToRemove.length})`;
  }

  if (failed > 0) {
    spinner.warn(`Completed with errors: ${succeeded} succeeded, ${failed} failed.`);
  } else {
    spinner.succeed(`Successfully removed ${succeeded} domain blocks.`);
  }
};
