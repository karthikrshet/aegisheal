# Testing

```bash
npm test            # everything (server, then client)
npm run lint        # syntax check (server) + import resolution (client)
npm run test --workspace server
npm run test --workspace client
npm run test:watch --workspace server   # re-run on save
```

Last verified run: **143 tests passing** (server 110 in 13 files, client 33 in 6 files) on Windows 11, Node.js 22.17.
