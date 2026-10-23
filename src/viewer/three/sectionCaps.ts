// "Tutup sayatan" untuk potongan sagital: penampang organ yang terpotong digambar padat (bukan berongga)
// memakai teknik stencil (hitung permukaan belakang − depan di bidang potong, lalu isi bidangnya).
import * as THREE from 'three'

interface Cap {
  source: THREE.Mesh
  helpers: THREE.Mesh[]
  plane: THREE.Mesh
}

const PLANE_GEO = new THREE.PlaneGeometry(24, 24)

function stencilMaterial(side: THREE.Side, op: THREE.StencilOp, plane: THREE.Plane) {
  return new THREE.MeshBasicMaterial({
    side,
    depthWrite: false,
    depthTest: false,
    colorWrite: false,
    stencilWrite: true,
    stencilFunc: THREE.AlwaysStencilFunc,
    stencilFail: op,
    stencilZFail: op,
    stencilZPass: op,
    clippingPlanes: [plane],
  })
}

function helperFor(mesh: THREE.Mesh, material: THREE.Material): THREE.Mesh {
  let h: THREE.Mesh
  if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
    const sm = mesh as THREE.SkinnedMesh
    const s = new THREE.SkinnedMesh(sm.geometry, material)
    s.bind(sm.skeleton, sm.bindMatrix)
    h = s
  } else h = new THREE.Mesh(mesh.geometry, material)
  h.raycast = () => undefined
  h.frustumCulled = false
  return h
}

function capColor(mesh: THREE.Mesh) {
  const m = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
  // penampang sedikit lebih terang dari permukaan, seperti jaringan yang diiris
  return (m.color ?? new THREE.Color('#ddd')).clone().lerp(new THREE.Color('#ffffff'), 0.22)
}

export class SectionCaps {
  private caps: Cap[] = []
  private root: THREE.Object3D

  constructor(root: THREE.Object3D, clipPlane: THREE.Plane) {
    this.root = root
    const meshes: THREE.Mesh[] = []
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || o.userData.capHelper) return
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material
      if (mat.transparent) return // kulit & rongga hidung transparan: tanpa tutup
      meshes.push(m)
    })
    meshes.forEach((mesh, i) => {
      const base = 200 + i * 3
      const back = helperFor(mesh, stencilMaterial(THREE.BackSide, THREE.IncrementWrapStencilOp, clipPlane))
      const front = helperFor(mesh, stencilMaterial(THREE.FrontSide, THREE.DecrementWrapStencilOp, clipPlane))
      back.renderOrder = base
      front.renderOrder = base + 1
      for (const h of [back, front]) {
        h.userData.capHelper = true
        mesh.add(h)
      }
      const plane = new THREE.Mesh(
        PLANE_GEO,
        new THREE.MeshStandardMaterial({
          color: capColor(mesh),
          roughness: 0.85,
          stencilWrite: true,
          stencilRef: 0,
          stencilFunc: THREE.NotEqualStencilFunc,
          stencilFail: THREE.ReplaceStencilOp,
          stencilZFail: THREE.ReplaceStencilOp,
          stencilZPass: THREE.ReplaceStencilOp,
        }),
      )
      plane.renderOrder = base + 2
      plane.userData.capHelper = true
      plane.raycast = () => undefined
      plane.name = `cap_${mesh.name}`
      root.add(plane)
      this.caps.push({ source: mesh, helpers: [back, front], plane })
    })
  }

  /** Dipanggil tiap frame setelah rig digerakkan. */
  update(enabled: boolean) {
    for (const c of this.caps) {
      let visible = enabled
      for (let o: THREE.Object3D | null = c.source; visible && o && o !== this.root; o = o.parent) visible = o.visible
      c.plane.visible = visible
      for (const h of c.helpers) h.visible = enabled
    }
  }
}
