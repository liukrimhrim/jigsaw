// Boot: wire board ↔ game ↔ ui, open the requested Puzzle or the Library.

import * as board from './board'
import * as game from './game'
import * as ui from './ui'
import { getPuzzle } from './store'

const qs = new URLSearchParams(location.search)

await board.initBoard(document.getElementById('app')!, {
  onChange: () => {
    ui.updateStatus()
    game.persistSoon()
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
}
