# Retriever Run 3.3 — Marshland Run

**Marshland Run** is an original instrumental score for steel-string guitar, six-string banjo, plucked upright bass, bass drum, woodblock, and tambourine. The instruments are sampled from acoustic recordings. The 32-bar cue runs at 112 BPM in 4/4 and loops every 68.57 seconds. Guitar carries the melody and rhythm, with a quieter banjo response and a heavier pulse as a run progresses.

## Composition

| Bars | Harmony | Arrangement |
| --- | --- | --- |
| 1–8 | D · D · G · D · Cadd9 · G · Asus · D | Alternating-thumb guitar and the first statement of the hook |
| 9–16 | D · D · G · D · Cadd9 · G · Asus · D | Hook reprise with the offbeat banjo response |
| 17–24 | Bm7 · G · D · Asus · Em7 · G · Cadd9 · Asus | Higher guitar register and more active banjo |
| 25–32 | D · D · G · D · Cadd9 · G · Asus · D | Return to the hook and a short pickup into bar one |

The opening two bars step from D4 through F♯4 to A4, answer down through F♯4–E4–D4, then answer with A3–D4–E4–F♯4. C natural gives the main phrase its Mixolydian color. The exact pitches, beat offsets, chord voicings, note lengths, and velocities are in [src/marshland.js](src/marshland.js).

| Run time | Bass | Percussion | Banjo | Extra offbeat rhythm |
| --- | ---: | ---: | ---: | ---: |
| Start | 33% | 19% | 8% | 0% |
| 30 seconds | 59% | 46% | 27% | 20% |
| 60 seconds | 80% | 72% | 58% | 57% |
| 90 seconds and later | 100% | 93% | 87% | 91% |

Guitar stays level. The gain changes ease in over a few beats, and the Web Audio clock keeps the cue in phase. The mix leaves room for approaching geese and gameplay effects.

## Recording credits

| Shipped file | Source and creator | License and edits |
| --- | --- | --- |
| `instruments.mp3`, steel guitar | Jeff Learman, [Martin HD-28 for Discord SFZ GM Bank](https://github.com/sfzinstruments/Discord-SFZ-GM-Bank/blob/master/Discord%20GM/Melodic/026-Acoustic%20Guitar%20%28steel%29/_MartinGM2-loop-sw.sfz) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Sample attacks were trimmed, EQ'd, leveled, and packed into a mono MP3 bank. |
| `instruments.mp3`, banjo | itsclipping, [Ganjo SX six-string banjo](https://github.com/sfzinstruments/ganjo) | [CC0 1.0](https://github.com/sfzinstruments/ganjo/blob/master/LICENSE.md). Same bank treatment. |
| `instruments.mp3`, upright bass | D. Smolken, [1958 Otto Rubner double bass](https://github.com/sfzinstruments/dsmolken.double-bass) | [CC0 1.0](https://github.com/sfzinstruments/dsmolken.double-bass/blob/master/LICENSE). Selected pizzicato samples, with the same bank treatment. |
| `instruments.mp3`, percussion | Versilian Studios, [Versilian Community Sample Library](https://github.com/sgossner/VCSL) | [CC0 1.0](https://github.com/sgossner/VCSL#vcsl). Bass drum `BDrumNew_hit_v2_rr1_Sum`, woodblock `wood_click2_mp`, and tambourine `Tamb1_Shake_rr1_Mid`, with the same bank treatment. |
| `canada-goose.mp3` | U.S. National Park Service, [Call of the Canada Goose](https://commons.wikimedia.org/wiki/File:Branta_canadensis.ogg) | U.S. public domain. A mono MP3 copy with EQ, level matching, and edge fades. |
| `mallard.mp3` | Jonathon Jongsma, [Mallard (Anas platyrhynchos), XC62258](https://commons.wikimedia.org/wiki/File:Anas_platyrhynchos_-_Mallard_-_XC62258.ogg), Powderhorn Park, Minneapolis | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The [edited recording](src/assets/audio/mallard.mp3) is distributed under the same license. It was mixed to mono, EQ'd, level matched, faded at the edges, and encoded as MP3. |

Wind, water, rain, wing flutter, paw movement, and breathing use original filtered foley. Collectible and impact cues reuse the credited instrument recordings.

## Playback and slide changes

- The three audio files total about 336 KB. Downloads begin on the first Start gesture and the browser decodes each sample once. One sound graph reuses those samples and limits overlapping voices.
- Master, music, wildlife and ambience, and gameplay effects are separately adjustable. Existing music and effects mute preferences carry forward with run history and outfits.
- Pause and page backgrounding suspend playback and the run. Resume requires a player gesture. Trail end fades the music and ambience while allowing a short impact cue.
- Slide uses a blended skeletal crouch, lightweight paw planting, and an upward-only correction based on skinned foot vertices. The player's world transform follows the trail and jump height. The lowered head envelope clears an overhead branch while ground obstacles still collide.

## Build and verification

Run `npm ci`, `npm test`, and `npm run build`. Deploy `dist/` through the existing GitHub Pages workflow on `main`. See the [deployment instructions](README.md#github-pages).

The regression tests sample the original skinned mesh through a complete slide on multiple trail sections, including full speed, and replay high-speed contacts against overhead and ground hazards. They also cover score timing and migration of saved mixer settings.
