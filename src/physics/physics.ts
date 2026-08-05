import RAPIER from '@dimforge/rapier3d';

export async function initPhysics() {
  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);

  // Future use: setup rigid bodies and colliders here

  return world;
}
