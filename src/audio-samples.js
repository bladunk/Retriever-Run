import instrumentsUrl from './assets/audio/instruments.mp3?url'
import gooseUrl from './assets/audio/canada-goose.mp3?url'
import mallardUrl from './assets/audio/mallard.mp3?url'

export const sampleUrls = { instruments: instrumentsUrl, goose: gooseUrl, mallard: mallardUrl }

// [MIDI pitch, offset in the mono sample bank, sample length]. The 75 ms guards
// between recordings leave room for MP3 encoder padding and resampling.
const instruments = {
  guitar: [
    [40, .075, 1.32], [43, 1.47, 1.32], [46, 2.865, 1.32], [49, 4.26, 1.32],
    [52, 5.655, 1.32], [55, 7.05, 1.32], [58, 8.445, 1.32], [61, 9.84, 1.32],
    [64, 11.235, 1.32], [68, 12.63, 1.32], [71, 14.025, 1.2932], [74, 15.3932, .9458],
  ],
  banjo: [[62, 16.414, .9], [66, 17.389, .9], [69, 18.364, .6595], [71, 19.0985, .6508], [73, 19.8244, .7065]],
  bass: [[31, 20.6059, 1.1], [34, 21.7809, 1.1], [38, 22.9559, 1.1], [41, 24.1309, 1.1], [45, 25.3059, 1.1]],
  drum: [[0, 26.4809, .48]],
  wood: [[0, 27.0359, .48]],
  shake: [[0, 27.5909, .48]],
}

export function instrumentSample(instrument, note) {
  const samples = instruments[instrument]
  let nearest = samples[0]
  for (const candidate of samples) {
    if (Math.abs(note - candidate[0]) < Math.abs(note - nearest[0])) nearest = candidate
  }
  return { speed: 2 ** ((note - nearest[0]) / 12), offset: nearest[1], length: nearest[2] }
}
