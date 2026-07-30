// Golden-file determinism test (SPEC M1): the Cut is the one piece of logic
// whose silent drift would corrupt every saved Puzzle — same inputs must
// yield bit-identical geometry forever.

import { createHash } from 'node:crypto'
import { expect, it } from 'vitest'
import { generateCut } from './cut'

const hashOf = (seed: number) =>
  createHash('sha256')
    .update(JSON.stringify(generateCut(960, 1440, 4, 6, seed, 0.075, 0.04).map((p) => p.segs)))
    .digest('hex')

it('cut generation matches the committed golden hash', () => {
  expect(hashOf(1)).toBe('c66aff72f1d80d69d1b3caa290b8adf56ab988c6dffca41fead03f4b01eaf1da')
})

it('same seed reproduces, different seed differs', () => {
  expect(hashOf(2)).toBe(hashOf(2))
  expect(hashOf(2)).not.toBe(hashOf(1))
})
