// Explicit ownership, no offscreen disposal, and no frame-history dependence.
export function setGroupOpacity(group, opacity) {
  if (!group) return
  group.visible = opacity > 0.001
  if (group.userData.opacity === opacity) return
  group.userData.opacity = opacity
  group.traverse((object) => {
    if (!object.material) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!material.transparent) {
        material.transparent = true
        material.needsUpdate = true
      }
      material.opacity = opacity
      material.depthWrite = opacity > 0.98
    })
  })
}
