# Marshland Run · Retriever Run soundtrack

**Marshland Run** is an original instrumental score for steel-string guitar, six-string banjo, plucked upright bass, bass drum, woodblock, tambourine, and harmonica. The instruments are sampled from acoustic recordings. The 32-bar cue runs at 120 BPM in 4/4 and loops every 64 seconds. Guitar carries the melody and rhythm, with a banjo response, a harmonica refrain, and added rhythm parts as a run progresses.

## Composition

| Bars | Harmony | Arrangement |
| --- | --- | --- |
| 1–8 | D · D · G · D · Cadd9 · G · Asus · D | Alternating-thumb guitar and the first statement of the hook |
| 9–16 | D · D · G · D · Cadd9 · G · Asus · D | Hook reprise with the offbeat banjo response |
| 17–24 | Bm7 · G · D · Asus · Em7 · G · Cadd9 · Asus | Higher guitar register, more active banjo, and a harmonica answer |
| 25–32 | D · D · G · D · Cadd9 · G · Asus · D | Return to the hook and a short pickup into bar one |

The opening two bars step from D4 through F♯4 to A4, answer down through F♯4–E4–D4, then answer with A3–D4–E4–F♯4. C natural gives the main phrase its Mixolydian color. The exact pitches, beat offsets, chord voicings, note lengths, and velocities are in [src/marshland.js](src/marshland.js).

| Active run time | Arrangement |
| --- | --- |
| 0–30 seconds | Guitar melody, upright bass, and light percussion |
| 30–60 seconds | Add banjo and syncopated bass and percussion |
| 60–90 seconds | Add harmonica phrases and fuller rhythm |
| 90–120 seconds | Introduce a picked guitar and bass counter-rhythm |
| 120 seconds and later | Full arrangement with both rhythmic figures |

The audio clock keeps all parts in phase. Menu and Lodge settings bring forward a half-time fingerpicked part. The Lodge drops drums and gives the harmonica more room. The Field Report begins with a short guitar cadence, then settles into a quiet variation. Goose warnings briefly lower the music bus and restore it smoothly.

## Recording credits

| Shipped file | Source and creator | License and edits |
| --- | --- | --- |
| `instruments.mp3`, steel guitar | Jeff Learman, [Martin HD-28 for Discord SFZ GM Bank](https://github.com/sfzinstruments/Discord-SFZ-GM-Bank/blob/master/Discord%20GM/Melodic/026-Acoustic%20Guitar%20%28steel%29/_MartinGM2-loop-sw.sfz) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Sample attacks were trimmed, EQ'd, leveled, and packed into a mono MP3 bank. |
| `instruments.mp3`, banjo | itsclipping, [Ganjo SX six-string banjo](https://github.com/sfzinstruments/ganjo) | [CC0 1.0](https://github.com/sfzinstruments/ganjo/blob/master/LICENSE.md). Same bank treatment. |
| `instruments.mp3`, upright bass | D. Smolken, [1958 Otto Rubner double bass](https://github.com/sfzinstruments/dsmolken.double-bass) | [CC0 1.0](https://github.com/sfzinstruments/dsmolken.double-bass/blob/master/LICENSE). Selected pizzicato samples, with the same bank treatment. |
| `instruments.mp3`, percussion | Versilian Studios, [Versilian Community Sample Library](https://github.com/sgossner/VCSL) | [CC0 1.0](https://github.com/sgossner/VCSL#vcsl). Bass drum `BDrumNew_hit_v2_rr1_Sum`, woodblock `wood_click2_mp`, and tambourine `Tamb1_Shake_rr1_Mid`, with the same bank treatment. |
| `instruments.mp3`, harmonica | Versilian Community Sample Library, [Hohner Special 20 in C](https://github.com/sgossner/VCSL/tree/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/Aerophones/Free%20Aerophones/Harmonica-Hohner-Special20-C/Sustains/Vib) | [CC0 1.0](https://github.com/sgossner/VCSL/blob/c1ea7bcc3c7309650ab0da9d15c9cd1fbc4a4c7e/LICENSE). Samples `Vib_C3`, `Vib_E3`, `Vib_G3`, and `Vib_C4` were trimmed, EQ'd, leveled, and added to the mono MP3 bank. |
| `canada-goose.mp3` | U.S. National Park Service, [Call of the Canada Goose](https://commons.wikimedia.org/wiki/File:Branta_canadensis.ogg) | U.S. public domain. A mono MP3 copy with EQ, level matching, and edge fades. |
| `mallard.mp3` | Jonathon Jongsma, [Mallard (Anas platyrhynchos), XC62258](https://commons.wikimedia.org/wiki/File:Anas_platyrhynchos_-_Mallard_-_XC62258.ogg), Powderhorn Park, Minneapolis | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). The [edited recording](src/assets/audio/mallard.mp3) is distributed under the same license. It was mixed to mono, EQ'd, level matched, faded at the edges, and encoded as MP3. |

Wind, water, rain, wing flutter, paw movement, and breathing use original filtered foley. Collectible and impact cues reuse the credited instrument recordings.

## Playback

- The three audio files total about 377 kB. The title prefetches the bank, and decoding and playback wait for a player gesture. The audio graph reuses the decoded samples and limits overlapping voices. If a file cannot load, the game continues.
- Master, music, wildlife, environmental ambience, and effects each have a saved volume. The header mute button restores the last nonzero music setting when unmuted.
- Pausing fades and suspends the audio clock. Backgrounding suspends immediately. Resume uses the same clock and requires a gesture. Where Safari exposes the ambient audio session, the game uses it for the hardware silent switch.

## Phase 08 listening notes

The migration blends 15 regional profiles for wind, moving water, foliage, insects and a recorded creek layer. Listen for the insect-rich Cypress mix, the stronger river layer in Platte, the drier and windier Sandhills, and the quieter foliage and colder wind in mountain country. The existing bird calls still require an actual encounter. Different surfaces reuse the existing footfall and splash variations. Territory boundaries and prestige awards add short cues composed from the existing sampled instruments. No new audio samples are required for this phase.

For a clean soundscape comparison, set Music, Wildlife calls and Gameplay effects to zero and leave Master and Environmental ambience on. Change one channel at a time to check separation. Background the game during a hunt and return to Resume to test suspension. Begin another hunt while the menu music is audible to hear the continuing transport. Repeat on a physical iPhone in Safari and as an installed application. Browser autoplay policy and the iPhone silent switch affect that review.

The reused additional recordings are identified in the [production asset register](docs/production/ASSET_LICENSES.md#phase-04-living-wilderness). The [regional values](src/field-soundscapes.js) and [audio graph](src/audio.js) provide the exact runtime mixes.

## Build and verification

Run `npm ci`, `npm test`, and `npm run build`. Deploy `dist/` through the existing GitHub Pages workflow on `main`. See the [deployment instructions](README.md#github-pages).

The regression tests cover synchronized loop boundaries, arrangement timing, and saved mixer settings.
