---
# mastodont-uq0a
title: Function to remove blocked domains
status: completed
type: feature
priority: normal
created_at: 2026-02-22T06:46:36Z
updated_at: 2026-02-22T06:47:22Z
---

Requesting a function to remove blocked domains from the server or whitelist servers.

Feed a .txt/.json/.csv file in and the app removes those entries from the blocklist or prevents them from being added from other lists.
Cheers and thanks

## Todo

- [x] Write failing tests for `loadDomainList` helper (txt/json/csv/url support)
- [x] Write failing tests for `removeBlocks` (deletes matching blocks via API)
- [x] Write failing tests for `setBlocks` allowlist filtering
- [x] Add `allowlist` to types (`MastodontArgs`/`MastodontConfig`)
- [x] Add `--allowlist` flag to `args.ts`
- [x] Implement `loadDomainList`, `removeBlocks`, update `setBlocks`
- [x] Update `index.ts` to dispatch `removeBlocks` vs `setBlocks`
- [x] Run all tests and verify they pass

## Summary of Changes

- **`src/types/index.d.ts`**: Added `allowlist?: string` to `MastodontArgs`
- **`src/args.ts`**: Added `--allowlist` / `-a` CLI flag
- **`src/blocks.ts`**:
  - `loadDomainList(source)`: shared helper that loads domains from a `.txt`, `.json`, or `.csv` file or URL; strips headers and empty lines
  - `removeBlocks(config)`: fetches current blocks then DELETEs any whose domain appears in the allowlist file; uses `DELETE /api/v1/admin/domain_blocks/:id`
  - `setBlocks`: refactored to use `loadDomainList`; when `config.allowlist` is set, domains in the allowlist are excluded from being added
- **`src/index.ts`**: dispatches to `removeBlocks` when `--allowlist` is given without `--blocklist`; otherwise calls `setBlocks` (which applies the allowlist filter internally)
