import { FruitWorld } from '../src/game/physics'
import { referenceGeometry } from '../src/game/session'

const g = referenceGeometry(560)
const w = new FruitWorld({ geometry: g, seed: 1 })
const cx = (g.left + g.right) / 2
w.drop(2, cx)
for (let i = 1; i <= 300; i += 1) {
  const events = w.step()
  if (i % 30 === 0) console.log(i, 'y', w.views()[0]?.y?.toFixed(1), 'score', w.score, events.map((e) => e.type).join(','))
}
console.log('fruits', w.fruitCount, 'bodies', w.bodyCount)

const w2 = new FruitWorld({ geometry: g, seed: 2 })
w2.drop(2, cx)
for (let i = 0; i < 100; i += 1) w2.step()
console.log('first settles at', w2.views()[0]?.y.toFixed(1))
w2.drop(2, cx)
for (let i = 0; i < 160; i += 1) {
  const ev = w2.step()
  if (ev.length) console.log('step', i, JSON.stringify(ev))
}
console.log('score', w2.score, 'views', w2.views().map((v) => ({ t: v.tier, y: v.y.toFixed(0), x: v.x.toFixed(0) })))
w.dispose()
w2.dispose()
