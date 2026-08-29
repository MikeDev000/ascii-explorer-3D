import RAPIER from '@dimforge/rapier3d';

export class PhysicsSystem {
  public static instance: PhysicsSystem;
  public world: RAPIER.World;

  constructor(world: RAPIER.World) {
    PhysicsSystem.instance = this;
    this.world = world;
  }

  public setGravity(g: number) {
    this.world.gravity = { x: 0, y: g, z: 0 };
    // We should wake up dynamic bodies when gravity changes globally
    // We can iterate over dynamic bodies if needed, but for now we'll rely on PlayerController waking itself or we can do it globally.
    this.world.bodies.forEach((body) => {
      if (body.isDynamic()) {
        body.wakeUp();
      }
    });
  }

  public getGravity(): number {
    return this.world.gravity.y;
  }
}

export async function initPhysics() {
  const gravity = { x: 0.0, y: -9.81, z: 0.0 };
  const world = new RAPIER.World(gravity);

  new PhysicsSystem(world);

  return world;
}
