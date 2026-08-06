# Hot Mic

This repo is a blank slate. A new prototype gets built here from a spec the user
will provide. There is no existing app code — do not go looking for it.

## Hard constraints

**Do not rename the Cloudflare Worker.** `wrangler.jsonc` sets `name: "hotmic"`,
which points at an already-provisioned Worker. Changing it creates a second
Worker and breaks the existing deploy. Leave the `name` field alone.

**Build output must land in `dist/`.** `wrangler.jsonc` serves static assets from
`./dist` with `not_found_handling: "single-page-application"`. If the new stack
builds somewhere else, either configure it to output to `dist/` or update
`assets.directory` to match — otherwise `wrangler deploy` ships an empty site.

## Free choices

Everything else is open. There is no package.json, no build tooling, and no
framework yet — the prototype's spec decides the stack. Add whatever it needs.

## Deploying

```
npx wrangler deploy
```

Requires a `dist/` build and wrangler installed (`npm i -D wrangler`). The
`$schema` path in `wrangler.jsonc` stays unresolvable until wrangler is
installed; that is expected and harmless.

## Ignore the other branch

`claude/hot-mic-prototype-setup-nq0203` holds an abandoned prototype
("Soundcheck" — an audio mixer game). It is dead and intentionally not merged.
Do not read from it, copy from it, or treat it as prior art for the new build.
