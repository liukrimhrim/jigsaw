// Boot: wire board ↔ game ↔ ui, open the requested Puzzle or the Library.

import * as board from './board'
import * as game from './game'
import * as sound from './sound'
import * as ui from './ui'
import { getPuzzle, ingestPhoto } from './store'

const qs = new URLSearchParams(location.search)

await board.initBoard(document.getElementById('app')!, {
  onChange: () => {
    ui.updateStatus()
    game.persistSoon()
  },
  onSnap: () => sound.click(),
  onSolved: () => {
    game.handleSolved()
    sound.ding()
    ui.confetti()
  },
})
ui.initUI(qs)

const gid = qs.get('g')
if (gid) {
  const r = await getPuzzle(parseInt(gid, 10))
  if (r) {
    await game.startGame(r)
    ui.hideLib()
  } else {
    await ui.showLib()
  }
} else {
  await ui.showLib()
}
ui.updateStatus()

// console/debug handle for verification harnesses
;(window as unknown as Record<string, unknown>).__spike = {
  get rec() { return game.getRec() },
  board: board.debug,
  ingestPhoto,
}
