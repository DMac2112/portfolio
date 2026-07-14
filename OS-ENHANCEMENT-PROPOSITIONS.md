# DominikOS — Propositions: XP Feel, Missing Staples & Games

*A high-level ideas document (not an implementation plan). Produced 2026-07-13 from a full source audit (15 code slices of `dominikos/os/src`, plan docs, Frostbyte, game1) plus web research on XP-era authenticity and 2000s gaming. Effort tags: **S** = a few hours, **M** = a day-ish, **L** = multi-day.*

---

## 1. State of the OS — TLDR

DominikOS is far more than a skin. What already exists and genuinely nails the fantasy:

- **A real window manager.** Drag (rAF-coalesced), 8-handle resize, minimize/maximize/restore with taskbar-suck + scale-from-icon animations, edge snapping (left/right/top), aspect-lock for games, focus shields on iframes, and a 12-window LRU cap. This is the hard part and it's done.
- **A proper shell.** Column-major icon grid with drag + snap-to-grid + ghost preview, rubber-band marquee selection, Alt+Tab switcher with reverse cycling, roving-tabindex keyboard nav, F6 region cycling, and desktop/icon right-click menus.
- **A believable boot ceremony.** BIOS → wordmark+marquee → Luna login tile → desktop, with a real session FSM (restart returns to login, not full boot), deep-links (`?boot=game`), and accessibility toggles baked into the chooser.
- **A synthesized audio engine that works.** Shared WebAudio `tone()` system; logon chime and shutdown motif are wired, and Pinball/Bubble/Mines/Solitaire/Flappy/Dialtone/Browser all use `tone()` for their own SFX. But `sound.click()` and `sound.ding()` are defined and never called, and there is no system-wide sound scheme (window events, errors, balloons, recycle).
- **Deep, genuinely-XP app fidelity.** Outlook-Express-style Contact, My Computer with fake C:/D: drives, Recycle Bin easter egg, a full Paint clone (Bresenham, flood-fill, 28-swatch palette, undo/redo), Dialtone IM with a pure call state-machine, and the IE-style DM Explorer browser with fake `*.dominikos.net` domains.
- **Seven working games** on one shared `useGameLoop` pause contract: Klondike (Pasjans), Minesweeper, Space-Cadet-style Pinball, Bubble Shooter, Flappy, plus Frostbyte (Club-Penguin-style world) and game1 (Dev District portfolio-RPG).
- **Accessibility and legal discipline most clones skip:** aria-live announcers, focus restoration, skip-links, `data-motion` reduce killswitch, a grep-based legal-gate banning MS asset fingerprints, and an "original homage" disclaimer.

**The through-line of what's missing:** the OS is visually and mechanically excellent but **mostly silent outside games, mostly menu-less, and has no "system settings" surface.** Those three are where the remaining nostalgia lives.

---

## 2. Missing XP staples — ranked by feel-per-effort

### (a) Sound & audio — *the biggest gap, and the cheapest to close*

People remember XP by ear; a mostly-silent shell reads as "unfinished" instantly.

| Proposition | TLDR | Why it sells the fantasy | Effort |
|---|---|---|---|
| **Startup/boot chime** | Soundalike "Microsoft Sound" as the desktop paints in | The most recognizable audio cue of the era; the boot sequence is currently silent until login | **S** |
| **Wire `click()` / `ding()`** | They exist as dead code — call them (Start clicks, menu nav, dialogs) | Zero new engine code | **S** |
| **Window event sounds** | Minimize/maximize/restore/close/error stingers | Every window interaction currently happens in silence | **S–M** |
| **Recycle swoosh** | Delete-to-bin sound | The Recycle Bin already exists — free flavor | **S** |
| **Balloon-tip two-tone** | Soft chime when a tray balloon pops | Pairs with balloon tips in §2b | **S** |
| **Critical-stop sound** | Error tone paired with the classic error dialog (§2b) | The "something broke" signature | **S** |

> **Legal note:** keep the existing pattern — synthesize *soundalike originals* via `tone()`, never ship actual MS `.wav` files. The XP recordings (Bill Brown compositions) carry real copyright weight, unlike generic UI chrome.

### (b) Shell micro-interactions — *structural "realness" cues*

| Proposition | TLDR | Why it sells the fantasy | Effort |
|---|---|---|---|
| **Menu bars (File / Edit / View / Help)** | Menu row on windows that lack one | The load-bearing skeleton of every XP app; Paint/Mines have one — Notepad, viewers, DocWindow don't | **M** |
| **Classic error dialog component** | White modal, red-X icon, Tahoma, OK/Cancel | One reusable component usable everywhere; pairs with critical-stop sound | **S** |
| **Tooltips on ~1s hover** | Delayed hover boxes on chrome + icons | Cheapest "this is a real OS" tell; only the clock has one today | **S–M** |
| **Balloon tips from the tray** | Security-Center-style speech bubbles | Nostalgic *and* the best vehicle for portfolio jokes ("Your résumé may be at risk…") | **M** |
| **Cascading Start Menu / All Programs flyout** | Hover-out submenus on Start | Two-column layout exists but no flyouts | **M** |
| **Title-bar sysmenu + taskbar-button right-click** | Move/Size/Minimize/Maximize/Close menus | Muscle-memory reflexes, both currently missing | **M** |
| **Show Desktop button; clock → Date/Time dialog** | Tray-end toggle; double-click clock opens tabbed calendar | Small period-correct "hidden depth" details | **S / M** |

*Already done — do not rebuild:* marquee selection, Alt+Tab, icon-drag ghosting, right-click Refresh, snap zones, resize cursors. (Gap on Refresh: it only resets aria-live text — make it actually re-flow icons.)

### (c) System apps a visitor expects

| Proposition | TLDR | Why it sells the fantasy | Effort |
|---|---|---|---|
| **Task Manager (Ctrl+Alt+Del)** | Fake Processes tab with fluctuating CPU% for "DominikOS.exe", "resume.exe" | The Ctrl+Alt+Del reflex is universal; high dev-audience delight | **M** |
| **Command Prompt** | Sandboxed `cmd` with `dir`, `whoami`, `help` + portfolio easter eggs | `dir C:\Projects` listing real work is a great gag for recruiters/devs | **M** |
| **Calculator** | Standard calc, Scientific-mode easter egg | Expected accessory, self-contained | **M** |
| **Control Panel** | Applet grid deep-linking to Display/Sounds settings | Cheap once §2d exists | **M** |
| **Disk Defragmenter** | Purely decorative colored-block shuffle | Famously mesmerizing, near-zero functional cost (see sleeper #1) | **S–M** |
| **Media player** | Skinnable mini-player + visualizer | Visualizer works as decoration even idle | **M–L** |

### (d) Personalization / Display Properties — *a category with zero coverage today*

Flagged in the audit: single hardcoded wallpaper, no selection UI, Aero theme reserved in tokens but unreachable, no screensaver.

| Proposition | TLDR | Why it sells the fantasy | Effort |
|---|---|---|---|
| **Display Properties dialog** | Right-click desktop → Properties → tabs for wallpaper/theme/screensaver | The canonical XP customization surface | **M** |
| **Wallpaper picker** | A few original SVG wallpapers to swap | The hill SVG already loads — make it a set | **S** |
| **Screensaver after idle** | 3D-Pipes or Starfield-style canvas after N idle seconds | High novelty/shareability: "wait, it has a *screensaver?*" | **M** |
| **Ship the Aero theme (or Classic toggle)** | Activate the reserved `data-theme="aero"` path | The hook already exists in tokens/SystemContext — designed, just unbuilt | **M–L** |

### (e) Easter eggs & era flavor — *including the Polish angle (the biggest personalization edge)*

| Proposition | TLDR | Why it sells the fantasy | Effort |
|---|---|---|---|
| **Gadu-Gadu tray homage** | Redesigned yellow-sunflower tray icon + original two-tone "brzęczyk"-style buzzer | For Polish visitors GG resonates harder than MSN; the standout personalization move | **S–M** |
| **"Łączenie z Neostradą…" boot detail** | Fake dial-up/broadband connect line during boot | Instantly Polish, instantly 2001 | **S** |
| **WP/Onet-style fake start page** | DM Explorer default page styled as an early-2000s Polish portal | Browser + DominikNet portal already exist — reskin one page | **S** |
| **WinRAR nag-dialog gag** | Desktop icon whose only function is the never-expiring "40-day trial" reminder | Cheap, funny, universally recognized | **S** |
| **BSOD easter egg** | Full blue error screen as a *rare/secret* trigger | Keep it hidden, not spammed | **S** |
| **Winamp-style player** | Skinned mini-player; original catchphrase instead of "whips the llama's ass" | Strong dev/tech recognition | **M** |

> **Legal note:** rename + redraw every third-party homage (GG sunflower, WinRAR, Winamp). If a Clippy-style assistant is ever added (§4), redesign the character — Microsoft trademarked the paperclip-with-eyes in 2021.

---

## 3. Games

### What was actually popular then

- **Bundled with XP:** Solitaire, **FreeCell**, **Spider Solitaire**, **Hearts**, the **Internet Games** (Checkers/Backgammon/Spades/Reversi via MSN Zone), Minesweeper, and 3D Pinball Space Cadet (XP was its last Windows release). DominikOS has the Solitaire/Mines/Pinball trio — **the rest of the card/board cohort is the real gap.**
- **Same lineage on every school PC:** SkiFree (the unkillable Yeti), Chip's Challenge, Hover!.
- **Casual/shareware era:** Bejeweled, Zuma, Peggle, Icy Tower, Chicken Invaders, DX-Ball, Snake.
- **Polish scene:** **Heroes III** (near-national-game cult status), **Gothic** (CD Projekt-localized, Witcher lineage), and freeware darlings **Icy Tower** (documented Kraków/Warsaw meetup culture) and **Chicken Invaders** (the shareware-CD circuit), plus gry.pl portals and Komputer Świat cover discs. Heroes/Gothic are reference tone, not build targets.

### Top 8 recommended additions (no overlap with existing games)

| # | Game | TLDR | Effort | Legal note |
|---|---|---|---|---|
| 1 | **FreeCell** | The single most obvious gap — sat next to Solitaire on every XP box | **S** | Public-domain rules; zero risk |
| 2 | **Chicken Invaders-style shmup** *(renamed)* | Wave-based shooter — a genre the OS lacks + huge Polish nostalgia | **M** | Original title/art; the chicken brand is proprietary |
| 3 | **Icy Tower-style vertical jumper** *(renamed)* | Score-chase platformer — the most Poland-coded pick | **S–M** | Clone the mechanic, new name/character |
| 4 | **Match-3 gem-swap** *(renamed)* | Fills a real mechanical gap (bubble-shooter ≠ match-3) | **S–M** | Match-3 predates Bejeweled (Shariki); don't copy PopCap art/name |
| 5 | **Hearts vs. simple AI** | The heart of the missing "Internet Games" nostalgia | **M** | Public-domain rules |
| 6 | **Spider Solitaire** | Completes the XP card trilogy | **M** | Public-domain rules |
| 7 | **Snake** | Near-free to build, universally recognized | **S** | Generic; no risk |
| 8 | **DX-Ball/Arkanoid-style breakout** | Shareware-CD staple; no paddle game exists yet | **S** | Generic brick-breaker; avoid the "Arkanoid" name |

**Honorable mentions:** SkiFree-style skier with Yeti chase (cheap, meme-able), Reversi (simplest AI of the Internet-Games set), Line Rider-style sled sandbox ("toy" energy suits a portfolio). **Avoid a Tetris clone** — *Tetris Holding v. Xio* (2012) established the shapes/playfield are protectable and the rights-holder actively DMCAs clones.

---

## 4. Sleeper ideas — high-delight, portfolio-meets-OS

1. **Defrag screensaver over project data.** The decorative Defragmenter block-shuffle where each colored block is a real project/skill. Mesmerizing *and* a stealth portfolio reel; doubles as the §2d screensaver. **(M)**
2. **Command Prompt as a portfolio CLI.** `whoami` → bio, `dir C:\Projects` → clickable list that opens real app windows, `experience --list`, hidden easter eggs. Perfect for the developer-heavy recruiter audience. **(M)**
3. **Redesigned Clippy-style recruiter assistant.** "It looks like you're trying to evaluate a candidate — need the résumé?" Canned-Q&A helper that links into apps. Original character shape. **(M)**
4. **Task Manager where the processes are skills.** `React.exe — 14% CPU`, `Salesforce-SFMC.exe — running`, `imposter-syndrome.exe — not responding`. **(M)**
5. **Balloon-tip campaign as first-boot tour.** Staged tray balloons ("New résumé detected", "Games folder now available") guide first-time visitors — onboarding disguised as period-authentic nagware. **(S–M once balloons exist)**

---

## 5. Suggested next 5 (if only five things get done)

1. **Boot chime + wire `click()`/`ding()` + window-event sounds.** Highest ROI in the document — the engine exists and the shell is silent between login and shutdown. *(S)*
2. **Classic error dialog + critical-stop sound.** One reusable component that unlocks the whole "something broke" comedy surface. *(S)*
3. **FreeCell.** The most glaring, lowest-risk, instantly-recognized game gap. *(S)*
4. **Gadu-Gadu tray homage (sunflower + buzzer).** Makes DominikOS unmistakably *yours* and Polish, not a generic XP clone. *(S–M)*
5. **Command Prompt with portfolio commands.** Turns the OS conceit into an actual portfolio-delivery mechanism for exactly the audience most likely to be hiring. *(M)*

---

*Audit provenance: 15 structured code inventories over `dominikos/os/src` (shell, window system, taskbar, boot/session/sound, store/registry, mobile, core apps, browser, Dialtone/Paint, games ×2, styles/assets, plan docs, Frostbyte, game1) + 2 web-research reports. Corrections applied after verification: `sound.logon()`/`sound.shutdown()` ARE wired (LoginScreen.tsx:29, OSShell.tsx:80); only `click()`/`ding()` are dead code. Marquee selection, Alt+Tab, icon ghosting, right-click Refresh, and snap already exist and are not proposed as new.*

---

# Appendix A — XP-feel research report (Sonnet, web-verified)

## A1. System sounds

Windows XP's default scheme was composed by **Bill Brown** (recorded with the Seattle Symphony) — a full musical suite, not just beeps.

The event → sound map a visitor's ear expects:

| Event | XP sound | Where it fires | Feel-impact |
|---|---|---|---|
| Boot | Startup chime | End of BIOS/POST, as desktop paints in | **High** — the single most recognizable audio cue of the era |
| Login success | Logon sound (distinct short chime) | After credentials clear | **High** *(already wired in DominikOS)* |
| Logoff / Shutdown | Logoff sound | Turn Off flow | **Medium** *(already wired)* |
| Menu/click nav | Short tick | Start clicks, menu opens, IE navigation | **Medium** — fires constantly |
| Default beep/"ding" | `ding.wav` | Generic notification, IM alert | **Medium** |
| Exclamation/Asterisk | `chord.wav` | Info dialogs | **Low-Medium** |
| Critical Stop | Critical-stop + red-X dialog | Fatal error dialogs | **High** — pairs with the visual |
| Balloon tip | Soft two-tone chime | Tray balloon pop-up | **Medium** |
| Recycle | `recycle.wav` swoosh | Delete to Recycle Bin | **Medium** |

**Licensing:** surveyed web clones (ShizukuIchi winXP, 1j01/98, etc.) bundle real WAVs with quiet risk tolerance and no documented safe harbor. For a portfolio under a real name, soundalike originals via the existing `tone()` engine are the correct pattern.

## A2. Shell behaviors & micro-interactions (full checklist)

High feel-impact: menu bars on every window; status bars ("Ready", item counts, zoom %); the classic error dialog; tooltips on ~1s hover; tray balloon tips; cascading Start Menu / All Programs flyout; screensavers after idle (3D Pipes, Starfield, Mystify, Marquee, Bubbles all shipped in XP).
Medium: right-click Refresh; Explorer hover-highlight rows; icon drag ghosting; clock double-click → tabbed Date/Time dialog; Display Properties (wallpaper/theme/screensaver tabs); BSOD as a rare easter egg; Windows Update shield in tray; Luna vs Classic theme toggle.
**Correctness note:** the "genie" minimize effect is macOS, not XP — real XP used a simple zoom-down toward the taskbar (which DominikOS already does correctly).

## A3. Bundled apps homage ideas

Task Manager (5 tabs; fake processes with jokey CPU%), Command Prompt (sandboxed, portfolio commands), Control Panel (applet grid), WMP/Winamp-style player with visualizer, Calculator (+Scientific easter egg), WordPad (only if truly rich-text; else skip), Character Map (glyph grid, copy-to-clipboard), Disk Defragmenter (decorative shuffle), Sound Recorder (low value), MSN Messenger signatures worth borrowing into Dialtone (window-shake Nudge, online/away/busy states, door sounds), Outlook Express (fake inbox with joke emails), Clippy (must be redesigned — trademarked 2021).

## A4. Era third-party icons & Polish culture (verified)

- **Winamp** — "It really whips the llama's ass" (JJ McKay, 1997). High recognition.
- **WinRAR nag dialog** — never-expiring 40-day trial. High recognition, trivially cheap.
- **ICQ "Uh-Oh!"** — iconic new-message sound. Good chat-app easter egg.
- **mIRC / DC++ / Kazaa / LimeWire / Nero** — best as non-functional desktop set dressing; cumulative effect matters.
- **Gadu-Gadu** — launched Aug 15, 2000 (Łukasz Foltyn, Radom); yellow sunflower tray icon; the two-tone "brzęczyk" was synonymous with "new message" for a generation of Poles; peaked ~10M+ users. **The single strongest Polish homage available.**
- **Tlen.pl** — GG's biggest rival (o2.pl, Oct 2001, modified XMPP, shut down May 2016). Good insider detail.
- **Neostrada** — TP's broadband brand from Jan 15, 2001; a fake "Łączenie…" connect line during boot is instantly period-Polish.
- **WP / Onet / Interia** — WP was Poland's first portal (1995); a fake early-2000s portal start page in DM Explorer is an easy win.

## A5. Trademark/copyright risk tiers

| Risk | Items | Mitigation |
|---|---|---|
| Low | Generic UI shapes, taskbar layout, window chrome | Build freely; avoid the MS wordmark/flag |
| Medium | Bliss wallpaper, exact icon art, exact Luna values | Recreate with original assets *(already done)* |
| Medium-high | Sound **recordings** (Bill Brown compositions) | Synthesize soundalikes *(already the pattern)* |
| High (trademark) | "Windows XP" name / MS flag as branding | "DominikOS" naming already does this work |
| High (character) | Clippy (trademarked 2021) | Redesign the character shape |
| Low-medium | Winamp, WinRAR, ICQ, GG, Nero brands | Rename + redraw; the joke survives |

---

# Appendix B — 2000s games research report (Sonnet, web-verified)

## B1. XP-bundled gap audit

| XP-era staple | In DominikOS? |
|---|---|
| Klondike Solitaire | ✅ (Pasjans) |
| Minesweeper | ✅ |
| 3D Pinball (Space Cadet-style) | ✅ |
| FreeCell | ❌ |
| Hearts | ❌ |
| Spider Solitaire | ❌ |
| Internet Checkers/Backgammon/Spades/Reversi | ❌ |
| Chip's Challenge-style tile puzzler | ❌ |
| Hover!-style 3D arcade | ❌ |
| SkiFree-style endless skier | ❌ |

Notes: 3D Pinball was a cut-down license of Maxis/Cinematronics' *Full Tilt! Pinball* (1995); XP was its last Windows release. Hearts was internally "The Microsoft Hearts Network." The Internet Games ran on MSN Zone matchmaking.

## B2. Cultural reference points (not build targets)

CS 1.6 (the *kawiarenka* internet-café staple that seeded Polish esports), The Sims, GTA Vice City, NFS Underground, AoE II, RollerCoaster Tycoon, Zoo Tycoon, Diablo II, Worms Armageddon, and for Poland specifically: **Heroes III** (localized 1999, thrived on hot-seat multiplayer when ~7% of Polish households had internet; still actively modded) and **Gothic** (CD Projekt-localized; cited influence on The Witcher).

## B3. Feasible clone candidates — full feasibility table

| Candidate | Effort | Fun/Effort | Legal note |
|---|---|---|---|
| FreeCell | S | High | Public domain |
| Spider Solitaire | M | High | Public domain |
| Hearts (vs bots) | M | High | Public domain; avoid MS chrome |
| Reversi | S | Med-High | Avoid the "Othello" trademark name |
| Checkers/Backgammon | M | Medium | Ancient; safe |
| Snake | S | High | Generic |
| Pong | S | Medium | Safe with original visuals |
| Breakout (DX-Ball-style) | S | High | Avoid "Arkanoid" name |
| Tetris-like | S–M | High | **Caution:** *Tetris Holding v. Xio* — actively enforced |
| Icy Tower-style jumper | S–M | **Very high** (PL nostalgia) | Freeware original; new name/character/assets |
| Chicken Invaders-style shmup | M | **Very high** (PL nostalgia) | Original title/art needed |
| Match-3 (Bejeweled-style) | S–M | High | Mechanic descends from *Shariki*; avoid PopCap trade dress |
| Zuma-style marble popper | M | Med-High | Mechanic from *Puzz Loop*; overlaps existing bubble shooter |
| SkiFree-style skier | S–M | High (meme value) | Fresh assets/name; the Yeti *joke* isn't protectable |
| Chip's Challenge-style puzzler | M–L | Medium | Needs level-design pipeline |
| Line Rider-style sandbox | M | High novelty | Many open clones exist; safe as homage |
| Peggle-style pachinko | L | Medium | Physics + content pipeline is the cost |
| Powder-Game-style sandbox | L | Medium | Generic falling-sand genre |
| Hover!-style 3D arcade | L | Medium | 3D-in-browser is a big lift vs the 2D stack |

## B4. Polish gaming culture notes

Heroes III (national-game status), Gothic (adopted via CD Projekt localization), Franko: The Crazy Revenge (1994/96, Szczecin — Polish game-dev heritage, pre-XP), Icy Tower (documented Kraków/Warsaw meetups, 11M+ downloads by 2008), Chicken Invaders (170M+ downloads series-wide; shareware-CD circuit), gry.pl / GRYOnline.pl (launched Jan 1, 2001; ~7,000 flash games — Poland's Miniclip), Komputer Świat Gry cover-disc culture (how Polish kids without internet actually got games, 2000–2003).
