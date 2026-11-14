import RAPIER, { type RigidBody, type World } from '@dimforge/rapier3d-compat';
import {
  MOVEMENT,
  controlledVelocity,
  type Movement,
} from '../../../shared/movement.ts';

export const HOVER = {
  radius: 0.5,
  halfHeight: 0.25,
  ...MOVEMENT,
} as const;

// Upper bits are membership; lower bits are the layers this collider can meet.
export const COLLISION = {
  terrain: (1 << 16) | 0x0003,
  craft: (2 << 16) | 0x0003,
} as const;

export function createCraft(
  world: World,
  position: { x: number; y: number; z: number },
  radius = HOVER.radius,
) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .lockRotations()
      .setCcdEnabled(true)
      .setCanSleep(false),
  );
  const collider = world.createCollider(
    RAPIER.ColliderDesc.cylinder(HOVER.halfHeight, radius)
      .setFriction(0)
      .setRestitution(0)
      .setCollisionGroups(COLLISION.craft),
    body,
  );
  return { body, collider };
}

export function steerCraft(body: RigidBody, input: Movement, dt: number) {
  const velocity = body.linvel();
  const target = controlledVelocity(velocity, input, dt);
  const mass = body.mass();
  body.applyImpulse(
    {
      x: (target.x - velocity.x) * mass,
      y: 0,
      z: (target.z - velocity.z) * mass,
    },
    true,
  );
}
