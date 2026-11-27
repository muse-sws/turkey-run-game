// Gobble Dash world: the three stages of the escape, obstacle kinds, and the
// spawner that lays hazards and corn along the road to the forest.
// Distance is in metres; the forest (freedom) is at ESCAPE_DISTANCE.

export const ESCAPE_DISTANCE = 600;
export const GROUND_Y = 452;
export const VIEW_W = 960;
export const VIEW_H = 540;

// Stages: 0 farmyard, 1 the kitchen yard, 2 the forest edge.
export const STAGES = [
  { name: 'THE FARMYARD', from: 0, to: 200, tint: null, spawnEvery: 150, knifeChance: 0.25 },
  { name: 'THE KITCHEN YARD', from: 200, to: 400, tint: 'rgba(200, 60, 20, 0.05)', spawnEvery: 125, knifeChance: 0.45 },
  { name: 'THE FOREST EDGE', from: 400, to: 600, tint: 'rgba(30, 90, 40, 0.08)', spawnEvery: 105, knifeChance: 0.55 },
];

export function stageFor(distance) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (distance >= STAGES[i].from) return i;
  }
  return 0;
}

// Obstacle kinds. `hop` means the turkey must jump it; `dodge` means it falls
// from the sky and the turkey must not be underneath it.
export const OBSTACLE_KINDS = {
  fence: { label: 'Fence', w: 46, h: 52, hop: true, score: 0 },
  hay: { label: 'Hay bale', w: 56, h: 52, hop: true, score: 0 },
  oven: { label: 'Oven', w: 74, h: 76, hop: true, score: 0 },
  knife: { label: 'Carving knife', w: 30, h: 62, hop: false, score: 0 },
};

export function makeObstacle(kind, x, rng) {
  const def = OBSTACLE_KINDS[kind];
  const obstacle = {
    kind,
    x,
    y: GROUND_Y,
    w: def.w,
    h: def.h,
    hop: def.hop,
    passed: false,
    // Knives fall from the sky onto a marked spot.
    fallY: kind === 'knife' ? -70 : 0,
    fallSpeed: kind === 'knife' ? 340 + rng() * 120 : 0,
    targetX: x,
    rotation: kind === 'knife' ? (rng() - 0.5) * 0.5 : 0,
    seed: rng(),
  };
  return obstacle;
}

// Pick the next hazard for this stretch of road. Ovens only appear once the
// turkey reaches the kitchen yard; knives get more common as it gets closer.
export function pickHazard(distance, rng) {
  const stage = stageFor(distance);
  const roll = rng();
  if (stage >= 1 && roll < 0.3) return 'oven';
  if (roll < 0.55) return 'fence';
  if (roll < 0.8) return 'hay';
  // Ovens only turn up once the turkey reaches the kitchen yard.
  return stage >= 1 ? 'oven' : 'hay';
}

export function makeCorn(x, y, rng) {
  return { x, y, taken: false, seed: rng() };
}

// Lay out a short stretch of corn, sometimes in a hop arc over a hazard.
export function cornRun(x, rng, overHazard) {
  const corns = [];
  const baseY = overHazard ? GROUND_Y - 96 : GROUND_Y - 40;
  for (let i = 0; i < 3; i++) {
    const y = overHazard ? baseY - Math.sin((i / 2) * Math.PI) * 30 : baseY;
    corns.push(makeCorn(x + i * 42, y, rng));
  }
  return corns;
}
