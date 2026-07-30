// WebAudio-synthesized feedback — no audio assets. Click on Snap, ding on solve.

let muted = false
export function setMuted(v: boolean) { muted = v }

let ctx: AudioContext | null = null
function ac(): AudioContext {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, delay = 0) {
  const c = ac()
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  const t0 = c.currentTime + delay
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur)
}

/** snap click — short, woody */
export function click() {
  if (!muted) tone(720, 0.07, 'triangle', 0.25)
}

/** completion ding — two-note chime */
export function ding() {
  if (muted) return
  tone(880, 0.35, 'sine', 0.2)
  tone(1318.5, 0.5, 'sine', 0.18, 0.12)
}
