// Boot: wire board ↔ game ↔ ui, open the requested Puzzle or the Library.

import { registerSW } from 'virtual:pwa-register'
import * as board from './board'
import * as game from './game'
import * as sound from './sound'
import * as ui from './ui'
import { getPuzzle, ingestPhoto } from './store'

registerSW({ immediate: true })

// no top-level await: TLA + code-split chunks can deadlock silently in builds
async function boot() {
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
  let opened = false
  if (gid) {
    try {
      const r = await getPuzzle(parseInt(gid, 10))
      if (r) {
        await game.startGame(r)
        ui.hideLib()
        opened = true
      }
    } catch (e) {
      console.error('failed to open puzzle', e) // corrupt record → land in the library
    }
  }
  if (!opened) await ui.showLib()
  ui.updateStatus()
}
boot().catch((e: unknown) => {
  console.error('boot failed', e)
  document.getElementById('status')!.textContent = `something broke on load: ${String(e)}`
})

// console/debug handle for verification harnesses
;(window as unknown as Record<string, unknown>).__spike = {
  get rec() { return game.getRec() },
  board: board.debug,
  ingestPhoto,
}
