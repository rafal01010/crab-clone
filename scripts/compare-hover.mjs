import RAPIER from '@dimforge/rapier3d-compat';
import {
  COLLISION,
  HOVER,
  createCraft,
  steerCraft,
} from '../server/match/physics/hover.ts';

await RAPIER.init();
const suspension = { height: 0.75, spring: 70, damping: 14 };
function steer(world, craft, input, model) {
  steerCraft(craft.body, input, dt);
  if (model !== 'spring') return;
  const body = craft.body;
  const velocity = body.linvel();
  const ray = new RAPIER.Ray(body.translation(), { x: 0, y: -1, z: 0 });
  const hit = world.castRay(
    ray,
    suspension.height * 2,
    true,
    undefined,
    COLLISION.terrain,
    craft.collider,
    body,
  );
  if (hit) {
    const force = Math.max(
      0,
      suspension.spring * (suspension.height - hit.timeOfImpact) -
        suspension.damping * velocity.y,
    );
    body.applyImpulse({ x: 0, y: force * body.mass() * dt, z: 0 }, true);
  }
}
const dt = 1 / 60;
const measurements = [];
for (const model of ['constrained', 'spring']) {
  for (let run = 0; run < 5; run++) {
    const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    world.timestep = dt;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(30, 0.25, 30)
        .setTranslation(0, -0.25, 0)
        .setFriction(0)
        .setCollisionGroups(COLLISION.terrain),
    );
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(0.25, 2, 4)
        .setTranslation(10, 2, 0)
        .setCollisionGroups(COLLISION.terrain),
    );
    const craft = createCraft(world, { x: 0, y: 1, z: 0 });
    const other = createCraft(world, { x: 4, y: 0.5, z: 6 + (run - 2) * 0.06 });
    const sample = { model, run, trace: {}, ranges: {} };
    const record = (name) => {
      const p = craft.body.translation();
      const v = craft.body.linvel();
      const q = craft.body.rotation();
      sample.trace[name] = {
        x: p.x,
        y: p.y,
        z: p.z,
        vx: v.x,
        vy: v.y,
        vz: v.z,
        rotation: [q.x, q.y, q.z, q.w],
      };
    };
    const step = (count, input, label) => {
      const range = {
        minY: Infinity,
        maxY: -Infinity,
        maxX: -Infinity,
        maxRotation: 0,
      };
      for (let i = 0; i < count; i++) {
        steer(world, craft, input, model);
        steer(world, other, { x: 0, y: 0 }, model);
        world.step();
        const p = craft.body.translation();
        const q = craft.body.rotation();
        range.minY = Math.min(range.minY, p.y);
        range.maxY = Math.max(range.maxY, p.y);
        range.maxX = Math.max(range.maxX, p.x);
        range.maxRotation = Math.max(
          range.maxRotation,
          Math.hypot(q.x, q.y, q.z),
        );
      }
      if (label) sample.ranges[label] = range;
    };
    const reset = (x, y, z) => {
      craft.body.setTranslation({ x, y, z }, true);
      craft.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      craft.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    };
    step(120, { x: 0, y: 0 }, 'settling');
    step(60, { x: 0, y: 0 }, 'rest');
    record('rest');
    step(60, { x: 1, y: 0 });
    record('accelerate');
    step(60, { x: 0, y: 0 });
    record('stop');
    reset(0, 1, -8);
    step(90, { x: Math.SQRT1_2, y: Math.SQRT1_2 });
    record('diagonal');
    reset(5, 1, 0);
    step(90, { x: 1, y: 0 }, 'wall');
    record('wall');
    reset(0, 1, 6);
    step(90, { x: 1, y: 0 });
    record('craft');
    sample.otherAfterCollision = other.body.translation();
    reset(0, 1, -6);
    craft.body.applyImpulse(
      { x: craft.body.mass() * 8, y: craft.body.mass() * 5, z: 0 },
      true,
    );
    step(20, { x: 0, y: 0 });
    record('knockback');
    step(120, { x: 0, y: 0 });
    record('recovery');
    const big = createCraft(world, { x: 5, y: 1, z: -2 });
    big.collider.setRadius(0.9);
    for (let i = 0; i < 90; i++) {
      steer(world, big, { x: 1, y: 0 }, model);
      world.step();
    }
    sample.largeAtWall = big.body.translation();
    reset(0, 4, -10);
    step(30, { x: 1, y: 0 }, 'airborne');
    record('airborne');
    step(120, { x: 0, y: 0 });
    record('landed');
    measurements.push(sample);
    world.free();
  }
}
console.log(
  JSON.stringify(
    { timestep: dt, parameters: { ...HOVER, suspension }, measurements },
    null,
    2,
  ),
);
