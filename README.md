# Bandruptcy — Tier 1

You are the live sound engineer for The Fire Exits. You see the stage on the top
of the screen and your mixing board on the bottom. The band plays. Things go
wrong. Notice what went wrong, work out which channel it affects, fix it before
the audience notices, and put it back when the moment passes.

This repository contains **tier 1**: three venues, the hub, the economy, three
side jobs, and the game's first board interference.

## Running it

```
npm install
npm run dev        # local dev server
npm run build      # typecheck + build to dist/
npx wrangler deploy
```

The build output goes to `dist/`, which is what `wrangler.jsonc` serves.

## What is here

| Area | State |
|---|---|
| Mixing board | Volume, tone, pan, FX per channel; master, house music, solo, record. Talkback is present and taped over — it arrives in tier 3. |
| Audio | Real Web Audio processing on separate per-instrument stems. The tone knob moves actual shelving filters, pan is a real stereo panner, FX is a real convolver and delay. |
| Stage | Three venues, part-based characters, a crowd that reads as the energy meter. |
| Events | 18 authored problems, each with a setup beat, a payoff beat, a grace period and a drain rate. |
| Scheduler | Fixed intensity/density curve per song section; the order shuffles between runs, the shape of the pressure does not. |
| Hub | Manager's office, the map, the store (his computer), the answering machine. |
| Economy | One gear gate at venue 3, three consumables, five wearables. |
| Side jobs | Three, one of each shape: hit a mark, capture something, wreck something. |
| Save | localStorage, survives the tab closing. |

## Generated assets

The design document calls for hand-drawn art scanned from paper and music
produced in a DAW. Neither exists yet, so both are **generated in code** as
stand-ins:

- **Art** is drawn procedurally onto the low-resolution canvas. Every character
  is assembled from named parts (head, torso, arms, legs, instrument) rotated
  around their joints, which is the same structure the hand-drawn pipeline
  described in §17.2 produces. Replacing a part with a scanned drawing means
  swapping one draw function, not rewriting the animation.
- **Music** is synthesised at runtime — one song, three arrangements (guitar,
  plus drums, plus bass). This is not only a placeholder: the game needs the
  instruments as genuinely separate signals so the board can process them
  independently, so real stems will drop into the same channel inputs.

Everything else — the events, the scheduler, the scoring, the economy — is the
real implementation.

## Layout

```
src/
  audio/     mixer graph, synth voices, the song, transport, event audio
  art/       drawing primitives, the band, the venues, the crowd
  game/      board, stage, events, scheduler, the gig loop, debrief, save
  hub/       office, store, map, answering machine
  core/      pixel canvas, 1-bit font baking, input, shared UI
  data/      venues, items, side jobs
```

## Known open questions

The design document lists these as undecided and they remain so: channel meters
on the strips, the exact neutral range widths, and whether a single mid-level
intensity spike beats a pure rising curve. The difficulty numbers in
`src/data/venues.ts` and `src/game/events.ts` are playtest starting points, as
the document intends, not settled values.
