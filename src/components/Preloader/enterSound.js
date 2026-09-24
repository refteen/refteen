// Синтезированный звук входа на сайт: мягкий восходящий двухнотный «динь»,
// воздушный «вжух» и едва слышный низкий толчок в момент ударной волны.
// Никаких аудиофайлов — только осцилляторы и шум Web Audio.
// Вызывать строго внутри обработчика жеста (click / keydown), иначе браузер не даст играть звук.
export function playEnterSound() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return
  let ctx
  try {
    ctx = new AC()
  } catch {
    return
  }
  if (ctx.state === 'suspended') ctx.resume()

  try {
    const t0 = ctx.currentTime + 0.015

    // общая шина: мягкий компрессор не даёт слоям «перегрузить» динамики
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3
    const master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(comp)
    comp.connect(ctx.destination)

    // один тон: быстрая атака без щелчка и экспоненциальное затухание
    const tone = (freq, type, at, peak, len) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, at)
      g.gain.setValueAtTime(0.0001, at)
      g.gain.exponentialRampToValueAtTime(peak, at + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, at + len)
      o.connect(g)
      g.connect(master)
      o.start(at)
      o.stop(at + len + 0.05)
    }

    // «колокольчик»: основной синус + тихая октава сверху для стеклянного призвука
    const bell = (freq, at, peak, len) => {
      tone(freq, 'sine', at, peak, len)
      tone(freq * 2, 'triangle', at, peak * 0.2, len * 0.5)
    }
    bell(659.25, t0, 0.085, 0.5) // ми
    bell(987.77, t0 + 0.12, 0.075, 0.68) // си — квинта вверх, звучит как «подтверждение»

    // «вжух»: белый шум через полосовой фильтр, частота которого плавно растёт
    const len = 0.85
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource()
    noise.buffer = buf
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 0.8
    band.frequency.setValueAtTime(320, t0)
    band.frequency.exponentialRampToValueAtTime(3600, t0 + 0.62)
    const air = ctx.createGain()
    air.gain.setValueAtTime(0.0001, t0)
    air.gain.exponentialRampToValueAtTime(0.045, t0 + 0.3)
    air.gain.exponentialRampToValueAtTime(0.0001, t0 + len)
    noise.connect(band)
    band.connect(air)
    air.connect(master)
    noise.start(t0)
    noise.stop(t0 + len)

    // мягкий низкий толчок — синхронно с ударной волной от кнопки
    const at = t0 + 0.1
    const sub = ctx.createOscillator()
    const subGain = ctx.createGain()
    sub.type = 'sine'
    sub.frequency.setValueAtTime(130, at)
    sub.frequency.exponentialRampToValueAtTime(46, at + 0.32)
    subGain.gain.setValueAtTime(0.0001, at)
    subGain.gain.exponentialRampToValueAtTime(0.1, at + 0.02)
    subGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.42)
    sub.connect(subGain)
    subGain.connect(master)
    sub.start(at)
    sub.stop(at + 0.45)
  } catch { /* no-op */ }

  // освобождаем аудио-ресурсы, когда звук отыграл
  setTimeout(() => ctx.close().catch(() => {}), 1500)
}
