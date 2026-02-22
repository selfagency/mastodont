---
# mastodont-7kfb
title: Error due to headless machine and no browser
status: in-progress
type: bug
priority: high
created_at: 2026-02-22T06:46:02Z
updated_at: 2026-02-22T18:26:52Z
---

ℹ Opening browser to instance blocklist... 22:10:36
node:events:491
throw er; // Unhandled 'error' event
^

Error: spawn xdg-open ENOENT
at Process.ChildProcess._handle.onexit (node:internal/child_process:285:19)
at onErrorNT (node:internal/child_process:485:16)
at processTicksAndRejections (node:internal/process/task_queues:83:21)
Emitted 'error' event on ChildProcess instance at:
at Process.ChildProcess._handle.onexit (node:internal/child_process:291:12)
at onErrorNT (node:internal/child_process:485:16)
at processTicksAndRejections (node:internal/process/task_queues:83:21) {
errno: -2,
code: 'ENOENT',
syscall: 'spawn xdg-open',
path: 'xdg-open',
spawnargs: [ 'https:///admin/instances?limited=1' ]
}

There is no GUI on this machine, the app does not handle that cleanly


## Branch
fix/mastodont-7kfb-headless-browser-error

## Todo
- [x] Write failing test for browser open error handling
- [x] Implement graceful error handling for open() in index.ts
- [x] Verify all tests pass
