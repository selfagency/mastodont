---
# mastodont-8u8z
title: Add support for CSV, JSON blocklists
status: in-progress
type: feature
priority: normal
created_at: 2026-02-22T06:45:25Z
updated_at: 2026-02-22T22:13:00Z
branch: feature/mastodont-8u8z-csv-json-blocklists
---

not just textfiles

## Todo
- [x] Set bean mastodont-8u8z to in-progress
- [x] Create branch `feature/mastodont-8u8z-csv-json-blocklists`
- [x] Add tests for CSV/JSON loading (added header-mapped CSV test)
- [x] Run test suite and confirm behavior (tests currently pass)
- [x] Implement CSV/JSON parsing using `csvtojson` (already implemented)
- [ ] Open draft PR and record URL here

## Notes
- `csvtojson` is added as a devDependency and `loadDomainList` now uses it to robustly parse CSV files and prefer a `domain` column when present.
