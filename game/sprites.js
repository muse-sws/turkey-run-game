// Gobble Dash art: every character and prop is drawn with Canvas 2D paths.
// Original art, no images. Autumn palette: pumpkin orange, harvest gold,
// barn red, forest green, warm browns.

export const PALETTE = {
  skyTop: '#f9b95c',
  skyMid: '#f7c873',
  skyLow: '#f2a65a',
  hillFar: '#c98a3d',
  hillNear: '#a86f2c',
  ground: '#8a5a22',
  groundTop: '#b57e35',
  barnRed: '#a83226',
  barnDark: '#7e241b',
  turkeyBrown: '#6b4423',
  turkeyLight: '#8a5a2e',
  turkeyDark: '#4a2c12',
  feather: '#b06a1e',
  beak: '#e8862e',
  wattle: '#c0392b',
  farmerShirt: '#3e6fb0',
  farmerOveralls: '#2e4a7a',
  farmerSkin: '#e8b98a',
  farmerHat: '#7a5a2e',
  ovenBlack: '#2b2b30',
  ovenGlow: '#ff7a1a',
  knifeBlade: '#dfe6ea',
  knifeHandle: '#4a2c12',
  cornYellow: '#ffd23f',
  cornGreen: '#5a9e3d',
};

// A seeded random helper (mulberry32) so scenes can be staged deterministically.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- characters -----------------------------------------------------------

// The hero turkey, facing right. phase animates the run (legs + wing bob).
// x, y is the ground point under the turkey; s is the scale.
export function drawTurkey(ctx, x, y, s, phase, opts = {}) {
  const flap = Math.sin(phase) * 0.12;
  const bob = Math.abs(Math.sin(phase)) * 3 * s;
  const air = opts.air || 0; // 0 on ground, 1 mid-hop
  const tilt = opts.tilt || 0;
  ctx.save();
  ctx.translate(x, y - bob - air * 26 * s);
  ctx.rotate(tilt);
  ctx.scale(s, s);

  // Tail feather fan.
  ctx.fillStyle = PALETTE.feather;
  for (let i = -2; i <= 2; i++) {
    ctx.save();
    ctx.rotate(i * 0.42);
    ctx.beginPath();
    ctx.ellipse(0, -34, 9, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7e4a12';
    ctx.beginPath();
    ctx.ellipse(0, -52, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = PALETTE.feather;
  }

  // Legs.
  ctx.strokeStyle = PALETTE.beak;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  const legSwing = Math.sin(phase) * 8;
  ctx.beginPath();
  ctx.moveTo(-6, -8);
  ctx.lineTo(-6 + legSwing, 0);
  ctx.moveTo(6, -8);
  ctx.lineTo(6 - legSwing, 0);
  ctx.stroke();

  // Body: a plump brown ellipse.
  const bodyGrad = ctx.createLinearGradient(-20, -40, 20, 0);
  bodyGrad.addColorStop(0, PALETTE.turkeyLight);
  bodyGrad.addColorStop(1, PALETTE.turkeyBrown);
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, -22, 26, 20, -0.08, 0, Math.PI * 2);
  ctx.fill();
  // Belly highlight.
  ctx.fillStyle = 'rgba(255, 220, 160, 0.35)';
  ctx.beginPath();
  ctx.ellipse(4, -16, 15, 10, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Wing, flapping a little with the run.
  ctx.fillStyle = PALETTE.turkeyDark;
  ctx.save();
  ctx.translate(-4, -24);
  ctx.rotate(-0.5 + flap);
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Neck and head.
  ctx.fillStyle = PALETTE.turkeyBrown;
  ctx.beginPath();
  ctx.ellipse(20, -44, 8, 14, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d98a7a';
  ctx.beginPath();
  ctx.arc(24, -56, 10, 0, Math.PI * 2);
  ctx.fill();
  // Snood + wattle.
  ctx.fillStyle = PALETTE.wattle;
  ctx.beginPath();
  ctx.ellipse(28, -48, 3.5, 6, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Beak.
  ctx.fillStyle = PALETTE.beak;
  ctx.beginPath();
  ctx.moveTo(30, -58);
  ctx.lineTo(42, -54);
  ctx.lineTo(30, -51);
  ctx.closePath();
  ctx.fill();
  // Eye: wide, worried, looking ahead.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(27, -59, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(28.2, -59, 1.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// The farmer, chasing from the left, pitchfork in hand, hat and overalls.
export function drawFarmer(ctx, x, y, s, phase, opts = {}) {
  const stride = Math.sin(phase) * 10;
  const angry = opts.angry || false;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);

  // Legs in overalls, mid-stride.
  ctx.strokeStyle = PALETTE.farmerOveralls;
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -34);
  ctx.lineTo(-8 + stride, 0);
  ctx.moveTo(0, -34);
  ctx.lineTo(8 - stride, 0);
  ctx.stroke();

  // Body: blue shirt + overalls.
  ctx.fillStyle = PALETTE.farmerShirt;
  ctx.beginPath();
  ctx.roundRect(-16, -72, 32, 40, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.farmerOveralls;
  ctx.fillRect(-14, -48, 28, 16);
  ctx.fillStyle = '#d8b13a';
  ctx.fillRect(-14, -48, 28, 3);

  // Arm reaching forward, holding the pitchfork.
  ctx.strokeStyle = PALETTE.farmerSkin;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(10, -64);
  ctx.lineTo(30, -52);
  ctx.stroke();
  // Pitchfork.
  ctx.strokeStyle = '#8a8f96';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, -52);
  ctx.lineTo(44, -84);
  ctx.moveTo(38, -80);
  ctx.lineTo(48, -88);
  ctx.moveTo(42, -82);
  ctx.lineTo(52, -90);
  ctx.stroke();

  // Head with a straw hat.
  ctx.fillStyle = PALETTE.farmerSkin;
  ctx.beginPath();
  ctx.arc(2, -84, 13, 0, Math.PI * 2);
  ctx.fill();
  // Moustache.
  ctx.fillStyle = '#5a3a1a';
  ctx.beginPath();
  ctx.ellipse(6, -78, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes: angry brows when chasing hard.
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(6, -88, 1.8, 0, Math.PI * 2);
  ctx.arc(12, -88, 1.8, 0, Math.PI * 2);
  ctx.fill();
  if (angry) {
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(2, -93);
    ctx.lineTo(10, -90);
    ctx.moveTo(16, -90);
    ctx.lineTo(9, -93);
    ctx.stroke();
  }
  // Straw hat.
  ctx.fillStyle = PALETTE.farmerHat;
  ctx.beginPath();
  ctx.ellipse(2, -94, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(2, -97, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ---- hazards and pickups --------------------------------------------------

// The dreaded oven: black iron box, glowing door, chimney, heat shimmer.
export function drawOven(ctx, x, y, s, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // Heat shimmer lines above the chimney.
  ctx.strokeStyle = 'rgba(255, 122, 26, 0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const wobble = Math.sin(time * 3 + i * 1.7) * 3;
    ctx.beginPath();
    ctx.moveTo(-8 + i * 8 + wobble, -78);
    ctx.quadraticCurveTo(-6 + i * 8 - wobble, -92, -8 + i * 8 + wobble, -104);
    ctx.stroke();
  }
  // Chimney.
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(-8, -84, 16, 14);
  // Body.
  const grad = ctx.createLinearGradient(-34, -70, 34, 0);
  grad.addColorStop(0, '#3d3d44');
  grad.addColorStop(1, PALETTE.ovenBlack);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-34, -70, 68, 70, 6);
  ctx.fill();
  // Glowing oven door.
  const glow = 0.55 + Math.sin(time * 4) * 0.25;
  ctx.fillStyle = `rgba(255, 122, 26, ${glow})`;
  ctx.beginPath();
  ctx.roundRect(-24, -52, 48, 34, 4);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 2;
  ctx.strokeRect(-24, -52, 48, 34);
  ctx.beginPath();
  ctx.moveTo(-24, -35);
  ctx.lineTo(24, -35);
  ctx.stroke();
  // Door handle + knobs.
  ctx.strokeStyle = '#c8ccd2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-18, -58);
  ctx.lineTo(18, -58);
  ctx.stroke();
  ctx.fillStyle = '#c8ccd2';
  ctx.beginPath();
  ctx.arc(-14, -64, 2.5, 0, Math.PI * 2);
  ctx.arc(14, -64, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Warning sign.
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(0, -46);
  ctx.lineTo(10, -30);
  ctx.lineTo(-10, -30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', 0, -32);
  ctx.restore();
}

// A carving knife, falling blade-first with a spinning glint.
export function drawKnife(ctx, x, y, s, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(s, s);
  // Blade.
  const bladeGrad = ctx.createLinearGradient(-8, -34, 8, 10);
  bladeGrad.addColorStop(0, '#ffffff');
  bladeGrad.addColorStop(1, '#9aa4ac');
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(0, -40);
  ctx.lineTo(9, 6);
  ctx.lineTo(0, 14);
  ctx.lineTo(-9, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6a7278';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Handle.
  ctx.fillStyle = PALETTE.knifeHandle;
  ctx.beginPath();
  ctx.roundRect(-5, 12, 10, 20, 4);
  ctx.fill();
  ctx.fillStyle = '#c8a24a';
  ctx.fillRect(-5, 12, 10, 3);
  ctx.restore();
}

// An ear of corn, the turkey's fuel: golden kernels, green husk.
export function drawCorn(ctx, x, y, s, time) {
  const bob = Math.sin(time * 3 + x * 0.01) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(s, s);
  // Husk leaves.
  ctx.fillStyle = PALETTE.cornGreen;
  ctx.beginPath();
  ctx.moveTo(-10, 12);
  ctx.quadraticCurveTo(-20, -6, -8, -16);
  ctx.quadraticCurveTo(-4, -2, -10, 12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10, 12);
  ctx.quadraticCurveTo(20, -6, 8, -16);
  ctx.quadraticCurveTo(4, -2, 10, 12);
  ctx.fill();
  // Cob.
  const grad = ctx.createLinearGradient(-10, -18, 10, 14);
  grad.addColorStop(0, '#ffe066');
  grad.addColorStop(1, '#f5a623');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, -2, 10, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  // Kernel dots.
  ctx.fillStyle = 'rgba(180, 110, 10, 0.55)';
  for (let row = -1; row <= 1; row++) {
    for (let col = -1; col <= 1; col++) {
      ctx.beginPath();
      ctx.arc(col * 5, row * 8, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// A hay bale / fence obstacle the turkey must hop over.
export function drawHayBale(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const grad = ctx.createLinearGradient(-26, -24, 26, 0);
  grad.addColorStop(0, '#e8b64c');
  grad.addColorStop(1, '#c98f2a');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -14, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#a8761f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, -14, 18 - i * 5, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFence(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(-3, -46, 6, 46);
  ctx.fillRect(22, -46, 6, 46);
  ctx.fillStyle = '#8f5a2a';
  ctx.fillRect(-12, -42, 50, 6);
  ctx.fillRect(-12, -24, 50, 6);
  ctx.restore();
}

// ---- scenery --------------------------------------------------------------

export function drawBackground(ctx, w, h, groundY, scroll, stage, time) {
  // Autumn sky.
  const sky = ctx.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(0.55, PALETTE.skyMid);
  sky.addColorStop(1, PALETTE.skyLow);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundY);

  // Low sun.
  ctx.fillStyle = 'rgba(255, 240, 180, 0.9)';
  ctx.beginPath();
  ctx.arc(w - 130, 84, 44, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 240, 180, 0.25)';
  ctx.beginPath();
  ctx.arc(w - 130, 84, 64, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds.
  ctx.fillStyle = 'rgba(255, 248, 235, 0.85)';
  for (let i = 0; i < 4; i++) {
    const cx = ((i * 260 - scroll * 0.15 + time * 4) % (w + 320) + w + 320) % (w + 320) - 160;
    const cy = 52 + (i % 3) * 34;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 52, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34, cy + 5, 36, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 36, cy + 6, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Far hills.
  ctx.fillStyle = PALETTE.hillFar;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= w; x += 40) {
    ctx.lineTo(x, groundY - 70 - Math.sin((x + scroll * 0.3) * 0.008) * 34);
  }
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();

  // Barn on the far hill (farmyard stage) or pines (forest stage).
  if (stage === 0) {
    drawBarn(ctx, 120 - (scroll * 0.2) % (w + 400), groundY - 96, 0.9);
  } else if (stage === 2) {
    for (let i = 0; i < 6; i++) {
      const tx = ((i * 190 - scroll * 0.35) % (w + 240) + w + 240) % (w + 240) - 120;
      drawPine(ctx, tx, groundY - 40, 1 + (i % 3) * 0.25);
    }
  }

  // Near hill.
  ctx.fillStyle = PALETTE.hillNear;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= w; x += 40) {
    ctx.lineTo(x, groundY - 26 - Math.sin((x + scroll * 0.5) * 0.01) * 12);
  }
  ctx.lineTo(w, groundY);
  ctx.closePath();
  ctx.fill();

  // Ground.
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
  groundGrad.addColorStop(0, PALETTE.groundTop);
  groundGrad.addColorStop(1, PALETTE.ground);
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, w, h - groundY);
  // Dirt speckles scrolling by.
  ctx.fillStyle = 'rgba(60, 35, 10, 0.35)';
  for (let i = 0; i < 26; i++) {
    const px = ((i * 97 - scroll) % (w + 60) + w + 60) % (w + 60) - 30;
    const py = groundY + 12 + ((i * 53) % Math.max(1, h - groundY - 22));
    ctx.fillRect(px, py, 5, 3);
  }
  // Grass tufts.
  ctx.strokeStyle = '#6a8f2f';
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const px = ((i * 131 - scroll * 1.2) % (w + 80) + w + 80) % (w + 80) - 40;
    ctx.beginPath();
    ctx.moveTo(px, groundY + 4);
    ctx.lineTo(px - 3, groundY - 6);
    ctx.moveTo(px + 3, groundY + 4);
    ctx.lineTo(px + 6, groundY - 5);
    ctx.stroke();
  }
}

export function drawBarn(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = PALETTE.barnRed;
  ctx.fillRect(-70, -70, 140, 70);
  ctx.fillStyle = PALETTE.barnDark;
  ctx.beginPath();
  ctx.moveTo(-78, -70);
  ctx.lineTo(0, -112);
  ctx.lineTo(78, -70);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath();
  ctx.moveTo(-78, -70);
  ctx.lineTo(0, -112);
  ctx.lineTo(78, -70);
  ctx.lineTo(70, -70);
  ctx.lineTo(0, -104);
  ctx.lineTo(-70, -70);
  ctx.closePath();
  ctx.fill();
  // Doors.
  ctx.fillStyle = '#5a1f16';
  ctx.fillRect(-26, -46, 52, 46);
  ctx.strokeStyle = '#f5e6c8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-26, -46);
  ctx.lineTo(26, 0);
  ctx.moveTo(26, -46);
  ctx.lineTo(-26, 0);
  ctx.stroke();
  // Loft window.
  ctx.fillStyle = '#ffe9a8';
  ctx.fillRect(-10, -88, 20, 16);
  ctx.restore();
}

export function drawPine(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#5a3a1a';
  ctx.fillRect(-4, -26, 8, 26);
  ctx.fillStyle = '#2f6b2f';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-30 + i * 7, -18 - i * 22);
    ctx.lineTo(30 - i * 7, -18 - i * 22);
    ctx.lineTo(0, -52 - i * 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
