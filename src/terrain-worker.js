import { buildTile } from './terrain-geometry.js'

self.onmessage = ({ data: index }) => {
  const packet = buildTile(index)
  const transfer = [packet.reeds.buffer]
  for (const geometry of [packet.ground, packet.water]) {
    if (!geometry) continue
    for (const { values } of Object.values(geometry.buffers)) transfer.push(values.buffer)
    if (geometry.index) transfer.push(geometry.index.buffer)
  }
  self.postMessage(packet, transfer)
}
