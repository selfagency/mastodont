---
# mastodont-9z5a
title: Mark imported instances with <import-mastodont>
status: in-progress
type: feature
priority: normal
created_at: 2026-02-22T06:45:48Z
updated_at: 2026-02-22T18:36:25Z
---

Where instances have been added to a blocklist using this tool add reason 'import-mastodont' to the blocking reason published by the server.  Then when running your script to generate the most-defederated list you could exclude those added by this tool.  Otherwise if it gets reasonable adoption you have some circularity, it's on the list because it's on the list, and lots of instances subscribe to the list.  Being on a blocklist is not a good reason for being on a blocklist..



## Branch
feature/mastodont-9z5a-import-marker

## Todo
- [ ] Write failing test for import marker
- [ ] Implement marker in blocks.ts
- [ ] Verify all tests pass
