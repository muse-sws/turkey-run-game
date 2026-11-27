// Gobble Dash — the game itself: state machine, physics, the farmer's chase,
// hazards, corn, HUD and every screen. Original game, written for this bounty.
import { SoundEffects } from './audio.js';
import {
  drawBackground, drawCorn, drawFarmer, drawFence, drawHayBale, drawKnife,
  drawOven, drawTurkey, mulberry32,
} from './sprites.js';
import {
  ESCAPE_DISTANCE, GROUND_Y, VIEW_W, VIEW_H, STAGES, stageFor,
  makeObstacle, makeCorn, pickHazard, cornRun,
} from './world.js';

const PX_PER_M = 14; // world pixels per metre of escape distance
const GRAVITY = 1500;
const JUMP_VELOCITY = -560;
const BASE_SPEED = 250;
const TURKEY_X = 185;
const MAX_LIVES = 3;

export class GobbleDashGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = new SoundEffects();
    this.state = 'title'; // title | playing | paused | caught | escaped
    this.time = 0;
    this.rng = mulberry32(20261127);
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem('gobble-dash-best') || 0) || 0;
    } catch {
      this.best = 0;
    }
    this.buttons = [];
    this.popups = [];
    this.resetRun();
  }

  resetRun() {
    this.score = 0;
    this.distance = 0;
    this.lives = MAX_LIVES;
    this.gap = 150; // pixels between the turkey and the farmer behind it
    this.speed = BASE_SPEED;
    this.turkeyX = TURKEY_X;
    this.turkeyY = 0; // height above the ground
    this.turkeyVy = 0;
    this.phase = 0; // run-cycle phase
    this.obstacles = [];
    this.corns = [];
    this.popups = [];
    this.shake = 0;
    this.invulnerable = 0;
    this.spawnIn = 90; // px of scroll until the next hazard
    this.cornIn = 160;
    this.knifeWarning = null;
    this.flash = 0;
    this.finalStats = null;
    this.runTime = 0;
  }

  start() {
    this.resetRun();
    this.state = 'playing';
    this.sound.unlock();
    this.sound.gobble();
  }

  restart() {
    this.start();
  }

  togglePause() {
    if (this.state === 'playing') this.state = 'paused';
    else if (this.state === 'paused') this.state = 'playing';
  }

  // ---- input ---------------------------------------------------------------

  onKey(code) {
    this.sound.unlock();
    if (code === 'KeyM') {
      this.sound.toggleMute();
      return;
    }
    if (this.state === 'title') {
      if (code === 'Enter' || code === 'Space') this.start();
      return;
    }
    if (this.state === 'caught' || this.state === 'escaped') {
      if (code === 'KeyR' || code === 'Enter' || code === 'Space') this.restart();
      return;
    }
    if (this.state === 'paused') {
      if (code === 'KeyP' || code === 'Escape' || code === 'Enter') this.togglePause();
      return;
    }
    // Playing.
    if (code === 'KeyP' || code === 'Escape') {
      this.togglePause();
      return;
    }
    if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') this.hop();
    if (code === 'ArrowDown' || code === 'KeyS') this.turkeyVy = Math.min(this.turkeyVy, 0) + 420;
  }

  hop() {
    if (this.turkeyY === 0) {
      this.turkeyVy = JUMP_VELOCITY;
      this.sound.hop();
    }
  }

  onClick(vx, vy) {
    this.sound.unlock();
    for (const button of this.buttons) {
      if (vx >= button.x && vx <= button.x + button.w && vy >= button.y && vy <= button.y + button.h) {
        button.action();
        return;
      }
    }
    if (this.state === 'playing') this.hop();
  }

  // ---- update ---------------------------------------------------------------

  update(dt) {
    this.time += dt;
    if (this.state !== 'playing') return;
    this.runTime += dt;
    const dashing = this.keysDown('ArrowRight', 'KeyD');
    const slowing = this.keysDown('ArrowLeft', 'KeyA');
    let targetSpeed = BASE_SPEED + this.distance * 0.22;
    if (dashing) targetSpeed *= 1.35;
    if (slowing) targetSpeed *= 0.72;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 3);

    // The turkey runs; the world scrolls; distance grows.
    const scroll = this.speed * dt;
    this.distance += scroll / PX_PER_M;
    this.phase += dt * (6 + this.speed / 60);

    // The farmer never stops: the gap closes unless the turkey earns room.
    this.gap -= 7 * dt;
    if (dashing) this.gap += 26 * dt;
    if (slowing) this.gap -= 10 * dt;
    // Keep the farmer on screen: the gap never grows past the turkey's lead.
    this.gap = Math.max(0, Math.min(150, this.gap));

    // Jump physics.
    if (this.turkeyY > 0 || this.turkeyVy !== 0) {
      this.turkeyVy += GRAVITY * dt;
      this.turkeyY += this.turkeyVy * dt;
      if (this.turkeyY <= 0) {
        this.turkeyY = 0;
        this.turkeyVy = 0;
      }
    }

    // Move hazards and corn with the world.
    for (const obstacle of this.obstacles) {
      obstacle.x -= scroll;
      if (obstacle.kind === 'knife') {
        obstacle.fallY += obstacle.fallSpeed * dt;
        if (obstacle.fallY >= GROUND_Y - 8 && !obstacle.landed) {
          obstacle.landed = true;
          obstacle.fallY = GROUND_Y - 8;
        }
      }
    }
    for (const corn of this.corns) corn.x -= scroll;
    this.obstacles = this.obstacles.filter((o) => o.x > -120);
    this.corns = this.corns.filter((c) => c.x > -60 && !c.taken);
    this.popups = this.popups.filter((p) => p.life > 0);
    for (const popup of this.popups) {
      popup.y -= 34 * dt;
      popup.life -= dt;
    }
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.flash > 0) this.flash -= dt;

    // Spawning.
    this.spawnIn -= scroll;
    if (this.spawnIn <= 0) {
      const stage = STAGES[stageFor(this.distance)];
      this.spawnIn = stage.spawnEvery * (0.9 + this.rng() * 0.35);
      const kind = pickHazard(this.distance, this.rng);
      this.obstacles.push(makeObstacle(kind, VIEW_W + 60, this.rng));
      if (kind === 'knife' && this.rng() < 0.5) {
        this.knifeWarning = { x: VIEW_W + 60, life: 0.9 };
      }
      if (this.rng() < 0.45) {
        this.corns.push(...cornRun(VIEW_W + 120 + this.rng() * 60, this.rng, this.rng() < 0.5));
      }
    }
    this.cornIn -= scroll;
    if (this.cornIn <= 0) {
      this.cornIn = 320 + this.rng() * 260;
      this.corns.push(...cornRun(VIEW_W + 80, this.rng, false));
    }

    this.checkCollisions();
    if (this.state !== 'playing') return;

    // Escape: the forest at last.
    if (this.distance >= ESCAPE_DISTANCE) {
      this.finishEscape();
      return;
    }
    // The farmer catches up.
    if (this.gap <= 0) {
      this.finishCaught('The farmer caught you!');
      return;
    }
  }

  keysDown(...codes) {
    return codes.some((code) => this.pressedKeys && this.pressedKeys.has(code));
  }

  checkCollisions() {
    const turkey = {
      x: this.turkeyX - 22,
      y: GROUND_Y - 74 - this.turkeyY,
      w: 48,
      h: 74,
    };
    // Corn: fuel for the run.
    for (const corn of this.corns) {
      if (corn.taken) continue;
      const dx = corn.x - (this.turkeyX + 4);
      const dy = corn.y - (GROUND_Y - 40 - this.turkeyY);
      if (Math.abs(dx) < 34 && Math.abs(dy) < 42) {
        corn.taken = true;
        this.score += 10;
        this.gap = Math.min(150, this.gap + 16);
        this.popups.push({ x: corn.x, y: corn.y - 10, text: '+10', life: 0.9 });
        this.sound.chirp();
      }
    }
    if (this.invulnerable > 0) return;
    // Hazards.
    for (const obstacle of this.obstacles) {
      if (obstacle.passed) continue;
      const ox = obstacle.x - obstacle.w / 2;
      const oy = obstacle.kind === 'knife' ? obstacle.fallY - obstacle.h : GROUND_Y - obstacle.h;
      const overlap =
        turkey.x < ox + obstacle.w &&
        turkey.x + turkey.w > ox &&
        turkey.y < oy + obstacle.h &&
        turkey.y + turkey.h > oy;
      if (overlap) {
        obstacle.passed = true;
        this.stumble(obstacle);
        continue;
      }
      // Clean pass: a little score for clearing a hop hazard.
      if (!obstacle.passed && obstacle.x + obstacle.w / 2 < this.turkeyX - 30) {
        obstacle.passed = true;
        if (obstacle.hop) {
          this.score += 5;
          this.popups.push({ x: this.turkeyX + 20, y: GROUND_Y - 110, text: '+5', life: 0.8 });
        }
      }
    }
  }

  stumble(obstacle) {
    this.lives -= 1;
    this.gap = Math.max(8, this.gap - 46);
    this.invulnerable = 1.3;
    this.shake = 0.35;
    this.flash = 0.25;
    this.sound.thud();
    const label = obstacle.kind === 'oven' ? 'TOO HOT!' : obstacle.kind === 'knife' ? 'THE KNIFE!' : 'TRIPPED!';
    this.popups.push({ x: this.turkeyX, y: GROUND_Y - 130, text: label, life: 1.1 });
    if (this.lives <= 0) {
      this.finishCaught(`Caught by the ${obstacle.kind === 'oven' ? 'oven' : obstacle.kind === 'knife' ? 'carving knife' : 'fence'}!`);
    }
  }

  finishCaught(reason) {
    this.state = 'caught';
    this.finalStats = { score: this.score, distance: Math.floor(this.distance), reason };
    this.sound.caught();
    this.saveBest();
  }

  finishEscape() {
    this.state = 'escaped';
    this.score += 100;
    this.finalStats = {
      score: this.score,
      distance: ESCAPE_DISTANCE,
      reason: 'You reached the forest — free at last!',
    };
    this.sound.fanfare();
    this.saveBest();
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        window.localStorage.setItem('gobble-dash-best', String(this.best));
      } catch {
        // Best score is garnish; never break the game over it.
      }
    }
  }

  // ---- deterministic staged scenes for screenshots ---------------------------

  setupShot(name) {
    const rng = mulberry32(7);
    this.resetRun();
    this.time = 1.4;
    if (name === 'title') {
      this.state = 'title';
      return;
    }
    if (name === 'escaped') {
      this.state = 'escaped';
      this.score = 520;
      this.distance = ESCAPE_DISTANCE;
      this.finalStats = { score: 520, distance: ESCAPE_DISTANCE, reason: 'You reached the forest — free at last!' };
      return;
    }
    if (name === 'caught') {
      this.state = 'caught';
      this.score = 180;
      this.distance = 243;
      this.lives = 0;
      this.gap = 4;
      this.finalStats = { score: 180, distance: 243, reason: 'The farmer caught you!' };
      return;
    }
    // Playing scenes: farmyard or kitchen yard.
    this.state = 'playing';
    this.phase = 2.2;
    if (name === 'kitchen') {
      this.distance = 268;
      this.score = 240;
      this.lives = 2;
      this.gap = 62;
      this.obstacles = [
        makeObstacle('oven', 600, rng),
        makeObstacle('knife', 730, rng),
        makeObstacle('fence', 880, rng),
      ];
      this.obstacles[1].fallY = 190;
      this.corns = cornRun(500, rng, true);
      this.corns.push(makeCorn(420, GROUND_Y - 40, rng));
    } else {
      // 'play': the farmyard, mid-run.
      this.distance = 132;
      this.score = 120;
      this.lives = 3;
      this.gap = 112;
      this.obstacles = [
        makeObstacle('fence', 520, rng),
        makeObstacle('hay', 700, rng),
        makeObstacle('knife', 830, rng),
      ];
      this.obstacles[2].fallY = 120;
      this.corns = cornRun(430, rng, true);
      this.corns.push(makeCorn(600, GROUND_Y - 40, rng));
    }
  }

  // ---- rendering -------------------------------------------------------------

  render() {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const scale = Math.min(cw / VIEW_W, ch / VIEW_H);
    const ox = (cw - VIEW_W * scale) / 2;
    const oy = (ch - VIEW_H * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#2b1a0e';
    ctx.fillRect(0, 0, cw, ch);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * 10 * this.shake, (Math.random() - 0.5) * 8 * this.shake);
    }
    const scroll = this.distance * PX_PER_M;
    const stage = stageFor(this.distance);
    drawBackground(ctx, VIEW_W, VIEW_H, GROUND_Y, scroll, stage, this.time);
    if (STAGES[stage].tint) {
      ctx.fillStyle = STAGES[stage].tint;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    if (this.state === 'title') {
      this.renderTitle(ctx);
      return;
    }
    this.renderWorld(ctx, scroll, stage);
    if (this.state === 'playing' || this.state === 'paused') {
      this.renderHud(ctx, stage);
    }
    if (this.state === 'paused') this.renderPaused(ctx);
    if (this.state === 'caught') this.renderEnd(ctx, false);
    if (this.state === 'escaped') this.renderEnd(ctx, true);
    if (this.flash > 0) {
      ctx.fillStyle = `rgba(200, 30, 20, ${this.flash * 0.9})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  renderWorld(ctx, scroll, stage) {
    // Knife warnings on the ground.
    for (const obstacle of this.obstacles) {
      if (obstacle.kind === 'knife' && !obstacle.landed) {
        ctx.strokeStyle = 'rgba(200, 30, 20, 0.85)';
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(obstacle.x, GROUND_Y + 4, 22, 7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#c81e14';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', obstacle.x, GROUND_Y - 12);
      }
    }
    // Corn.
    for (const corn of this.corns) {
      if (!corn.taken) drawCorn(ctx, corn.x, corn.y, 1, this.time);
    }
    // Hazards.
    for (const obstacle of this.obstacles) {
      if (obstacle.kind === 'fence') drawFence(ctx, obstacle.x, GROUND_Y, 1);
      else if (obstacle.kind === 'hay') drawHayBale(ctx, obstacle.x, GROUND_Y, 1);
      else if (obstacle.kind === 'oven') drawOven(ctx, obstacle.x, GROUND_Y, 1, this.time);
      else if (obstacle.kind === 'knife') drawKnife(ctx, obstacle.x, obstacle.fallY, 1, obstacle.rotation);
    }
    // The farmer and the turkey only run while the run is live; the end
    // screens stage their own scene.
    if (this.state === 'playing' || this.state === 'paused') {
      // The farmer, chasing from behind.
      const farmerX = this.turkeyX - this.gap;
      const angry = this.gap < 70;
      drawFarmer(ctx, farmerX, GROUND_Y, 1.05, this.phase * 1.15, { angry });
      if (angry && this.state === 'playing') {
        ctx.fillStyle = '#c81e14';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("HE'S RIGHT BEHIND YOU!", VIEW_W / 2, 108);
      }
      // The turkey (blinking while invulnerable).
      if (!(this.invulnerable > 0 && Math.floor(this.time * 12) % 2 === 0)) {
        const air = this.turkeyY > 0 ? Math.min(1, this.turkeyY / 90) : 0;
        drawTurkey(ctx, this.turkeyX, GROUND_Y - this.turkeyY, 1, this.phase, { air });
      }
    }
    // Score popups.
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    for (const popup of this.popups) {
      ctx.fillStyle = popup.text.startsWith('+') ? '#ffd23f' : '#ff5a3c';
      ctx.strokeStyle = 'rgba(60, 20, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(popup.text, popup.x, popup.y);
      ctx.fillText(popup.text, popup.x, popup.y);
    }
  }

  renderHud(ctx, stage) {
    this.buttons = [];
    // Top bar.
    ctx.fillStyle = 'rgba(43, 26, 14, 0.82)';
    ctx.beginPath();
    ctx.roundRect(10, 10, VIEW_W - 20, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE  ${this.score}`, 26, 33);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`DISTANCE  ${Math.floor(this.distance)}m / ${ESCAPE_DISTANCE}m`, 26, 54 - 12 + 12);
    // Distance progress bar to the forest.
    const barX = 300;
    const barW = 300;
    const progress = Math.min(1, this.distance / ESCAPE_DISTANCE);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(barX, 24, barW, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#5a9e3d';
    ctx.beginPath();
    ctx.roundRect(barX, 24, barW * progress, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('FOREST', barX + barW + 10, 35);
    // Lives as hearts.
    for (let i = 0; i < MAX_LIVES; i++) {
      const hx = 700 + i * 34;
      ctx.fillStyle = i < this.lives ? '#e8452c' : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(hx, 30, 9, 0, Math.PI * 2);
      ctx.arc(hx + 14, 30, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 7, 34);
      ctx.lineTo(hx + 21, 34);
      ctx.lineTo(hx + 7, 48);
      ctx.closePath();
      ctx.fill();
    }
    // Farmer gap meter.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('FARMER', 820, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.roundRect(820, 30, 110, 10, 5);
    ctx.fill();
    const gapFrac = Math.max(0, Math.min(1, this.gap / 150));
    ctx.fillStyle = gapFrac > 0.4 ? '#ffd23f' : '#e8452c';
    ctx.beginPath();
    ctx.roundRect(820, 30, 110 * gapFrac, 10, 5);
    ctx.fill();
    // Stage label under the bar.
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`— ${STAGES[stage].name} —`, VIEW_W / 2, 84);
    // Mute button, tucked under the HUD bar on the right.
    this.drawButton(ctx, VIEW_W - 78, 68, 66, 26, this.sound.muted ? 'MUTED' : 'SOUND', () => {
      this.sound.toggleMute();
    }, 12);
  }

  renderTitle(ctx) {
    // Warm title panel.
    ctx.fillStyle = 'rgba(43, 26, 14, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Big hero turkey and the farmer sneaking in behind.
    drawTurkey(ctx, 250, 400, 1.7, 0.4, { air: 0 });
    drawFarmer(ctx, 110, GROUND_Y, 1.05, 0.4, { angry: true });
    drawOven(ctx, 830, GROUND_Y, 0.85, this.time);
    drawKnife(ctx, 870, 120, 0.9, 0.35);
    drawCorn(ctx, 660, GROUND_Y - 110, 1, this.time);
    drawCorn(ctx, 710, GROUND_Y - 110, 1, this.time + 1);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 74px "Trebuchet MS", sans-serif';
    ctx.strokeStyle = 'rgba(60, 20, 0, 0.9)';
    ctx.lineWidth = 8;
    ctx.strokeText('GOBBLE DASH', VIEW_W / 2, 130);
    ctx.fillText('GOBBLE DASH', VIEW_W / 2, 130);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Trebuchet MS", sans-serif';
    ctx.fillText('A Turkey Run Thanksgiving Escape', VIEW_W / 2, 172);
    ctx.font = '17px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('Thanksgiving is coming. The farmer wants dinner. You are dinner.', VIEW_W / 2, 210);
    ctx.fillText('Outrun the farmer, hop the fences and ovens, dodge the carving knives,', VIEW_W / 2, 236);
    ctx.fillText('gobble the corn — and reach the forest 600m away.', VIEW_W / 2, 262);

    this.buttons = [];
    this.drawButton(ctx, VIEW_W / 2 - 130, 300, 260, 56, '▶  START THE RUN', () => this.start(), 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '15px "Trebuchet MS", sans-serif';
    ctx.fillText('Move: ← → or A / D    Hop: Space or ↑    Pause: P    Mute: M', VIEW_W / 2, 392);
    ctx.fillText('Click also hops. Best score: ' + this.best, VIEW_W / 2, 418);
    ctx.fillStyle = '#e8c99a';
    ctx.font = '13px "Trebuchet MS", sans-serif';
    ctx.fillText('An original game — no turkeys were harmed in the making.', VIEW_W / 2, 508);
  }

  renderPaused(ctx) {
    ctx.fillStyle = 'rgba(43, 26, 14, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Trebuchet MS", sans-serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 250);
    ctx.font = '18px "Trebuchet MS", sans-serif';
    ctx.fillText('Press P or Enter to keep running', VIEW_W / 2, 292);
  }

  renderEnd(ctx, escaped) {
    ctx.fillStyle = escaped ? 'rgba(20, 70, 30, 0.55)' : 'rgba(60, 10, 5, 0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Scene: a free turkey in the pines, or the farmer holding the turkey.
    if (escaped) {
      drawTurkey(ctx, 300, GROUND_Y, 1.35, 0.6, { air: 0 });
      drawCorn(ctx, 195, GROUND_Y - 50, 1, this.time);
      drawCorn(ctx, 405, GROUND_Y - 50, 1, this.time + 2);
    } else {
      // The farmer, the turkey and the oven, set low so the restart button clears them.
      drawFarmer(ctx, VIEW_W / 2 + 60, GROUND_Y + 26, 1.2, 0.3, { angry: true });
      drawTurkey(ctx, VIEW_W / 2 - 40, GROUND_Y + 26, 1, 1.2, { tilt: -0.3 });
      drawOven(ctx, VIEW_W / 2 + 190, GROUND_Y + 26, 0.8, this.time);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = escaped ? '#8dff6a' : '#ff6a4a';
    ctx.font = 'bold 64px "Trebuchet MS", sans-serif';
    ctx.strokeStyle = 'rgba(40, 10, 0, 0.9)';
    ctx.lineWidth = 7;
    const title = escaped ? 'ESCAPED!' : 'CAUGHT!';
    ctx.strokeText(title, VIEW_W / 2, 150);
    ctx.fillText(title, VIEW_W / 2, 150);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Trebuchet MS", sans-serif';
    ctx.fillText(this.finalStats.reason, VIEW_W / 2, 196);
    ctx.font = '20px "Trebuchet MS", sans-serif';
    ctx.fillText(`Score: ${this.finalStats.score}    Distance: ${this.finalStats.distance}m    Best: ${this.best}`, VIEW_W / 2, 232);
    if (!escaped) {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '16px "Trebuchet MS", sans-serif';
      ctx.fillText('The farmer is already sharpening the carving knife…', VIEW_W / 2, 262);
    } else {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '16px "Trebuchet MS", sans-serif';
      ctx.fillText('No Thanksgiving dinner tonight. Gobble gobble!', VIEW_W / 2, 262);
    }
    this.buttons = [];
    this.drawButton(ctx, VIEW_W / 2 - 110, 300, 220, 52, '↻  RUN AGAIN  (R)', () => this.restart(), 21);
  }

  drawButton(ctx, x, y, w, h, label, action, fontSize = 15) {
    ctx.save();
    ctx.fillStyle = '#e8862e';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 9);
    ctx.fill();
    ctx.strokeStyle = '#7a3c08';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    ctx.restore();
    this.buttons.push({ x, y, w, h, action });
  }
}
