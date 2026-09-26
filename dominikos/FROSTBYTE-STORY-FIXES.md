# Frostbyte story — what's broken and the fix plan

Two independent end-to-end reviews (Claude: 44 issues; Codex: 9) agree on the core problem:
**the game has good pieces but no spine.** No opening, the threads never meet, and no ending.

## The story today (as a new player sees it)
1. Spawn in the plaza. No reason you're here, no goal, no pointer. The fountain and noticeboard do nothing.
2. Wander into the court: Edda (editor, The Chirper) gives 3 tips. Workshop: Pat's Weather Bell needs 3 parts.
   Lighthouse: Maren wants 3 sightings. Docks: Salka's ship is there 3 days in 8 and has nothing for you.
3. Collect curios. Vesper the fox (whom nobody mentions) trades hints at 6 / 14 / 22 curios, opening Moonwell and
   the Caverns, where an unseen Echo sings 3 lines.
4. 39/39 curios → a toast and a lantern. Nobody reacts. The Echo is never explained. The Bell never rings.

## Proposed spine — ⚠️ needs your OK before the bigger rewrites
> Long ago **Driftback the Wayfinder** heard a **three-note song under the sea ice** and founded Chillmere where it
> was loudest. He set old lighthouse **lenses** on the trail lamps to guide ships, and cast the **Weather Bell** to
> answer the song. The song is **the Echo**: aurora light trapped in the Hollowfrost crystals.
>
> **You** arrive on the Driftwood Gull with a blank Curio Log (**hook**). Edda hires you as her stringer
> (**motivation**). Pat's Bell, Maren's log and Salka's floes each hold **one of the three notes** (**threads
> converge**). Vesper trades what she knows for curios (**gate**). With all three notes, the repaired Bell answers the
> Echo in the Caverns, and the aurora pours out over Chillmere (**ending**). The Chirper prints your front page, and
> every character has a line about it.

## Fixes, grouped by what they take

### A — text/data only (safe; no new features) → Codex, now
- Broken id: Chowder's home room `cafe` doesn't exist → `court` (`content/npc-roster.js:20`).
- One newspaper: the plaza "Chronicle" board vs Edda's "Chirper" → Chirper everywhere.
- Notes: the cobble hums one note, while the carving and the paper say three → three everywhere.
- Stale Chirper articles read like patch notes ("Harbor Road… for now" while the docks are open) → in-world news.
  A court "fountain" curio sits in a court with no fountain → retext it.
- Word consistency:
  - "barge" → "the Gull" (it's a sailing ship);
  - "stamped" → "stitched" (the Log uses knit stitches);
  - pennant colour → orange oilskin;
  - Maren's "spiral stair" → the east arch.
- Loose ends in text:
  - Pat's "companion pen" and the pet-shop "snowtails" imply pets that don't exist → close the tease;
  - "Patio Mittens Seek Owner" → close the joke;
  - room-agnostic chatter says "this plaza" in other rooms → make it room-neutral.
- The map pins' geography is inverted vs the actual exits (`content/map.js`) → match the doors.
- One cause for the Bell's scattered parts and one route for the clapper.

### B — small features (after the spine OK) → Codex, 2–3 runs
- **Opening:** a one-time arrival card plus Edda pointing you at the Log (`introSeen` save flag).
- **Landmarks and noticeboards do something:** there is no `actionFor` case for them today. This gives Driftback's
  lore a home.
- **Bell payoff:**
  - its lines change from "half-built" once the Bell is repaired;
  - it chimes on ship days;
  - it teaches the three notes.
- **The Chirper prints your reports** (a "Reader Reports" strip built from finished favors).
- **Pointers:**
  - someone mentions Vesper;
  - a "Gull due in N days" sign at the docks;
  - Salka mentions the clapper.
- **Edda's first tip no longer stalls** when today's glints were already collected (a story glint).
- **The Curio Log stops spoiling the secret rooms** (unvisited rooms show as "uncharted").
- **The Echo's unused greeting** plays on the first visit. No aurora indoors.
- **Finale** at the three notes / 39 curios: a 4th Echo line, the aurora, a front page, and a reaction line from
  each character.

### C — clickables that miss the painted art → Claude measures, Codex applies
- Court curios (6), docks curios (7), the workshop's blueprint, computer and Bell-test spots, the keeper's-rest
  kettle, the trail vane and signpost, the coil (it sits on a roof), and 2 of Vesper's 3 dens.
- The Chirper board sits on blank snow.
- Collision bug: arriving in Whisperpine from the Caverns strands you on an island (a ~22px neck in the traced ground).

### Minigames tie-in
See `FROSTBYTE-MINIGAMES.md`. Bell Rhythm, Thaw Path and Floe Fishing each deliver one of the three notes.
