import { buildTile } from './terrain-geometry.js'

self.onmessage = ({ data }) => {
  const index = typeof data === 'number' ? data : data.index
  const start = performance.now()
  const packet = buildTile(index, data.seed)
  packet.buildMs = performance.now() - start
  const transfer = [packet.reeds.buffer, packet.trees.buffer, packet.crops.buffer, packet.shoreGrass.buffer]
  for (const geometry of [packet.ground, packet.detail, packet.solid, packet.water]) {
    if (!geometry) continue
    for (const { values } of Object.values(geometry.buffers)) transfer.push(values.buffer)
    if (geometry.index) transfer.push(geometry.index.buffer)
  }
  self.postMessage(packet, transfer)
}
