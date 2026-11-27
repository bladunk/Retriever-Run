// Marshland Run: an original 32-bar theme with arrangements for the changing journey.
export const beatSeconds = 60 / 120
export const loopBeats = 128

const progression = [
  'D', 'D', 'G', 'D', 'C', 'G', 'A', 'D',
  'D', 'D', 'G', 'D', 'C', 'G', 'A', 'D',
  'Bm', 'G', 'D', 'A', 'Em', 'G', 'C', 'A',
  'D', 'D', 'G', 'D', 'C', 'G', 'A', 'D',
]

const voicings = {
  D: [38, 45, 50, 57, 62, 66], G: [43, 50, 55, 59, 62, 67],
  C: [36, 43, 48, 55, 62, 64], A: [33, 40, 52, 57, 62, 64],
  Bm: [35, 42, 54, 57, 59, 62], Em: [40, 47, 52, 55, 59, 62],
}

// Each phrase is written as [beat within bar, MIDI pitch, length in beats].
const hook = [
  [[.5, 62, .5], [1, 66, .48], [1.5, 69, .88], [2.5, 66, .43], [3, 64, .43], [3.5, 62, .49]],
  [[0, 57, .9], [1.5, 62, .46], [2, 64, .5], [2.5, 66, 1.16]],
  [[0, 67, .7], [1, 69, .42], [1.5, 71, .89], [2.5, 69, .42], [3, 67, .88]],
  [[0, 66, .62], [1, 64, .38], [1.5, 62, 1.35], [3.5, 57, .4]],
  [[0, 64, .85], [1, 67, .38], [1.5, 69, .91], [2.5, 67, .44], [3, 64, .85]],
  [[0, 62, .67], [1, 67, .40], [1.5, 71, .88], [2.5, 69, .39], [3, 67, .77]],
  [[0, 64, .67], [1, 62, .42], [1.5, 64, .41], [2, 69, .70], [3, 64, .42], [3.5, 61, .46]],
  [[0, 62, 1.7], [2, 57, .79], [3.5, 62, .36]],
]
const bridge = [
  [[0, 66, .8], [1, 69, .48], [1.5, 71, 1.32], [3, 74, .83]],
  [[0, 71, .85], [1, 69, .41], [1.5, 67, .88], [2.5, 62, 1.21]],
  [[0, 66, .88], [1, 62, .89], [2, 57, .45], [2.5, 62, .44], [3, 66, .84]],
  [[0, 64, 1.32], [1.5, 69, 1.23], [3, 73, .91]],
  [[0, 71, .81], [1, 67, .43], [1.5, 64, 1.33], [3, 67, .88]],
  [[0, 69, .44], [.5, 71, .87], [1.5, 74, .88], [2.5, 71, .41], [3, 67, .94]],
  [[0, 67, .89], [1, 64, .43], [1.5, 62, 1.36], [3, 67, .9]],
  [[0, 69, .93], [1.5, 64, .63], [2.5, 61, .82], [3.5, 57, .42]],
]

const stages = [
  // Lead, bass, drum, banjo, offbeats, reed, picked pulse, thumb guitar, airy tremolo.
  [0,   [.66,.44,.19,.00,.08,.04,.00,.66,.15]],
  [90,  [.75,.55,.30,.22,.16,.12,.10,.40,.21]],
  [175, [.83,.65,.48,.43,.34,.22,.16,.31,.32]],
  [260, [.72,.69,.45,.36,.30,.28,.26,.34,.47]],
  [340, [.45,.64,.24,.14,.16,.31,.18,.41,.86]],
  [410, [.65,.77,.45,.21,.22,.34,.39,.28,.91]],
  [450, [.79,.86,.60,.41,.44,.34,.69,.20,.79]],
  [570, [.86,.92,.67,.49,.54,.37,.89,.15,.68]],
]

const indoors = {
  title: [.28,.22,.00,.05,.00,.16,.00,.92,.32],
  lodge: [.11,.19,.00,.00,.00,.09,.00,.86,.38],
  kennel:[.17,.15,.00,.00,.00,.05,.00,.78,.24],
  over:  [.13,.17,.00,.00,.00,.00,.00,.60,.15],
}

// Cache by whole elapsed second. Audio ramps crossfade arrangements on the
// existing transport, which never drops the beat or restarts a territory.
let lastSecond = -1
let lastMix
export function musicIntensity(seconds) {
  const second = Math.floor(Math.max(0, Number.isFinite(seconds) ? seconds : 0))
  if (second === lastSecond) return lastMix
  lastSecond = second
  const index = stages.findIndex(([begin]) => begin > second)
  if (index === -1) return (lastMix = stages.at(-1)[1])
  const [begin, start] = stages[index - 1]
  const [end, finish] = stages[index]
  // Hold the regional arrangement, then move into the next one over 20s.
  const handoff = Math.max(begin, end - 20)
  const amount = Math.max(0, (second - handoff) / (end - handoff))
  const fade = amount * amount * (3 - 2 * amount)
  return (lastMix = start.map((level, i) => level + (finish[i] - level) * fade))
}

export function musicMix(mode, seconds) {
  return indoors[mode] ?? musicIntensity(seconds)
}

export function composeBar(index) {
  const bar = index % progression.length
  const chord = voicings[progression[bar]]
  const events = []
  function add(layer, instrument, pitch, beat, length, volume, pan = 0) {
    events.push({ layer, instrument, pitch, beat, length, volume, pan })
  }

  const melody = (bar >= 16 && bar < 24 ? bridge : hook)[bar % 8]
  for (const [beat, pitch, length] of melody) {
    add(0, 'guitar', pitch, beat + (beat % 1 ? .021 : .004), length, beat % 1 ? .17 : .21, .10)
  }

  // A thumb keeps time while softer offbeat strokes fill the spaces in the hook.
  for (const [beat, string, level] of [[0, 0, .12], [.52, 2, .065], [1.54, 3, .064],
    [2, 1, .105], [2.53, 2, .074], [3.54, 4, .061]]) {
    const pitch = chord[string]
    add(0, 'guitar', pitch < 40 ? pitch + 12 : pitch, beat, .78, level, -.32)
  }
  for (const beat of [1, 3]) {
    for (let string = 2; string < 6; string++) {
      const offset = (beat === 1 ? string - 2 : 5 - string) * .018
      add(0, 'guitar', chord[string], beat + offset + .013, .51, string === 2 ? .067 : .046, -.31)
    }
  }

  const nextRoot = voicings[progression[(bar + 1) % 32]][0]
  add(1, 'bass', chord[0], 0, 1.43, .175)
  add(1, 'bass', chord[0] + 7, 2, 1.05, .12)
  add(1, 'bass', nextRoot + (bar % 2 ? -2 : 2), 3.49, .46, .08)

  add(2, 'drum', 0, .004, .64, .14)
  add(2, 'drum', 0, bar % 4 === 3 ? 2.49 : 2, .54, .092)
  add(2, 'wood', 0, 1.025, .40, .066, -.16)
  add(2, 'wood', 0, 3.023, .39, .08, -.16)
  for (const beat of [.53, 1.54, 2.55, 3.54]) {
    add(2, 'shake', 0, beat, .46, beat > 3 ? .041 : .033, .26)
  }

  // Bring in a second rhythmic figure without changing the loop or the hook.
  add(4, 'bass', chord[0], 1.51, .42, .058)
  add(4, 'shake', 0, .77, .31, .037, .21)
  add(4, 'drum', 0, 2.74, .42, .062)
  add(4, 'wood', 0, bar % 2 ? 3.77 : 1.78, .31, .037, -.20)

  if (bar % 2 || (bar >= 16 && bar < 24)) {
    const fill = [[.54, chord[4]], [1.56, chord[5]], [2.55, chord[3]], [3.56, chord[4]]]
    for (const [beat, pitch] of fill) add(3, 'banjo', pitch, beat, .58, beat > 3 ? .090 : .059, .35)
  } else {
    add(3, 'banjo', chord[4], 1.55, .66, .065, .35)
    add(3, 'banjo', chord[5], 3.55, .55, .073, .35)
  }
  // A quiet half-time guitar part stays in time with the trail arrangement.
  add(7, 'guitar', chord[2], .056, 1.5, .115, -.16)
  add(7, 'guitar', chord[3], 1.08, 1.25, .075, -.14)
  add(7, 'guitar', chord[4], 2.07, 1.60, .096, .11)
  add(7, 'guitar', melody.at(-1)[1], 3.06, 1.22, .105, .13)

  const harmonica = {
    7: [[2.06, 66], [3.03, 64]], 15: [[2.1, 62], [3.14, 57]],
    19: [[.24, 69], [2.13, 64]], 23: [[1.12, 62], [2.4, 64]],
    27: [[2.08, 66], [3.16, 69]], 31: [[1.99, 64], [3.03, 62]],
  }[bar] ?? []
  for (const [beat, pitch] of harmonica) add(5, 'harmonica', pitch, beat, .94, .086, .30)

  // Extra picked notes and a bass pickup change the pattern at the fastest pace.
  add(6, 'bass', chord[0] + 12, 3.285, .36, .069)
  add(6, 'guitar', chord[3], .785, .39, .071, -.22)
  add(6, 'guitar', chord[4], 2.79, .32, .059, -.24)
  add(6, 'shake', 0, 3.81, .31, .034, .24)

  // Long, softly re-picked open intervals answer the hook. These sit high
  // in the stereo field while the warm bass and heel rhythm remain centered.
  for (const [beat,pitch] of [[.12,chord[4] + 12],[1.19,chord[3] + 12],[2.19,chord[5] + 7],[3.22,chord[4] + 12]]) {
    add(8,'guitar',pitch,beat,1.51,.067,beat < 2 ? -.45 : .31)
    if (bar % 4 === 3) add(8,'guitar',pitch-12,beat+.17,1.27,.029,.40)
  }
  return events.sort((a, b) => a.beat - b.beat)
}
