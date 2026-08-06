# Hot Mic

Blank slate. A new prototype is going to be built here.

## What's kept

- `wrangler.jsonc` — Cloudflare Workers config. The Worker is named `hotmic` and
  serves static assets from `./dist` as a single-page app. Keep the `name` field
  as-is so deploys land on the existing Worker instead of creating a new one.
- `.gitignore` — ignores `node_modules`, `dist`, `.wrangler`, and local files.

Everything else was removed. The new prototype brings its own stack, build
tooling, and dependencies.

## Deploying

Once the prototype builds to `dist/`:

```
npx wrangler deploy
```
