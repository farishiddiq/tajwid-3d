import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { ellipsoid, polygonize } from './sdf'

describe('surface nets', () => {
  it('bola: tertutup, radius benar, normal menghadap keluar', () => {
    const geo = polygonize(ellipsoid([0, 0, 0], [1, 1, 1]), [-1.3, -1.3, -1.3], [1.3, 1.3, 1.3], 0.1, 0)
    const pos = geo.getAttribute('position')
    const nor = geo.getAttribute('normal')
    expect(pos.count).toBeGreaterThan(300)
    let outward = 0
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector3().fromBufferAttribute(pos, i)
      expect(p.length()).toBeGreaterThan(0.93)
      expect(p.length()).toBeLessThan(1.07)
      if (p.dot(new THREE.Vector3().fromBufferAttribute(nor, i)) > 0) outward++
    }
    expect(outward / pos.count).toBeGreaterThan(0.98)
  })
})
