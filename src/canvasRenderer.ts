import { Bubble, Chest, Coin, FloatingText, Octopus, Particle } from './types';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  /**
   * Render underwater background, animated sun caustics, and seabed
   */
  public renderBackground(time: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Underwater Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#7dd3fc'); // Surface sunlit sky blue
    bgGrad.addColorStop(0.15, '#38bdf8'); // Clear light ocean blue
    bgGrad.addColorStop(0.5, '#0ea5e9'); // Mid-depth tropical azure
    bgGrad.addColorStop(0.85, '#0284c7'); // Rich blue
    bgGrad.addColorStop(1, '#0369a1'); // Deep sea bed
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Animated Caustics / Sun Rays
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    const numRays = 7;
    for (let i = 0; i < numRays; i++) {
      const rayWidth = w / numRays;
      const xOffset = i * rayWidth + Math.sin(time * 0.8 + i * 1.5) * (rayWidth * 0.4);
      const rayGrad = ctx.createLinearGradient(xOffset, 0, xOffset + Math.cos(time + i) * 60, h * 0.8);
      rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      rayGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.08)');
      rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(xOffset, 0);
      ctx.lineTo(xOffset + rayWidth * 0.7, 0);
      ctx.lineTo(xOffset + rayWidth * 1.3 + Math.sin(time * 0.5 + i) * 50, h * 0.85);
      ctx.lineTo(xOffset - rayWidth * 0.3 + Math.sin(time * 0.5 + i) * 50, h * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 3. Sandy Seabed at the bottom
    this.renderSeabed(time);
  }

  /**
   * Render sandy bottom with natural dunes, sea shells, and swaying kelp
   */
  private renderSeabed(time: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const seabedHeight = Math.min(85, h * 0.12);
    const baseY = h - seabedHeight;

    // Back dune
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(0, baseY - 8);
    ctx.quadraticCurveTo(w * 0.35, baseY - 22, w * 0.65, baseY - 6);
    ctx.quadraticCurveTo(w * 0.85, baseY + 6, w, baseY - 12);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Swaying seaweed/kelp on sides
    this.renderSeaweed(25, h - 30, 60, time, '#047857');
    this.renderSeaweed(45, h - 25, 45, time + 1.2, '#059669');
    this.renderSeaweed(w - 35, h - 30, 65, time + 0.5, '#047857');
    this.renderSeaweed(w - 55, h - 25, 50, time + 1.8, '#059669');

    // Main Sandy Floor
    const sandGrad = ctx.createLinearGradient(0, baseY, 0, h);
    sandGrad.addColorStop(0, '#fde68a'); // Warm golden sand
    sandGrad.addColorStop(0.3, '#f59e0b');
    sandGrad.addColorStop(1, '#b45309'); // Shaded seabed

    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.quadraticCurveTo(w * 0.25, baseY - 12, w * 0.55, baseY);
    ctx.quadraticCurveTo(w * 0.8, baseY + 10, w, baseY - 4);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Little sea pebbles/shells
    ctx.fillStyle = 'rgba(254, 243, 199, 0.7)';
    const pebbles = [
      { x: w * 0.15, y: h - 18, r: 4 },
      { x: w * 0.18, y: h - 14, r: 2.5 },
      { x: w * 0.42, y: h - 12, r: 3 },
      { x: w * 0.78, y: h - 20, r: 5 },
      { x: w * 0.82, y: h - 15, r: 3 },
      { x: w * 0.9, y: h - 24, r: 4 },
    ];
    pebbles.forEach(p => {
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  /**
   * Render gentle swaying underwater kelp
   */
  private renderSeaweed(baseX: number, baseY: number, length: number, time: number, color: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);

    const segments = 5;
    const segLen = length / segments;
    let currX = baseX;
    let currY = baseY;

    for (let i = 1; i <= segments; i++) {
      const sway = Math.sin(time * 2 + i * 0.8) * (i * 3.5);
      const nextX = baseX + sway;
      const nextY = currY - segLen;
      ctx.quadraticCurveTo(currX, currY - segLen * 0.5, nextX, nextY);
      currX = nextX;
      currY = nextY;
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render gentle water surface ripples at the top
   */
  public renderSurfaceRipples(time: number) {
    const ctx = this.ctx;
    const w = this.width;
    const surfH = 48;

    // Gentle water surface ripple bar
    const surfGrad = ctx.createLinearGradient(0, 0, 0, surfH);
    surfGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    surfGrad.addColorStop(0.6, 'rgba(224, 242, 254, 0.15)');
    surfGrad.addColorStop(1, 'rgba(224, 242, 254, 0)');

    ctx.fillStyle = surfGrad;
    ctx.fillRect(0, 0, w, surfH);

    // Surface wave ripples
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 15) {
      const y = 8 + Math.sin(time * 3 + x * 0.05) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary subtle wave ripple
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 18) {
      const y = 14 + Math.sin(time * 2.2 + x * 0.04 + 1.2) * 2.5;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Render rising ambient underwater bubbles
   */
  public renderBubbles(bubbles: Bubble[], time: number) {
    const ctx = this.ctx;
    ctx.save();

    for (const b of bubbles) {
      const wobbleX = b.x + Math.sin(time * b.wobbleSpeed + b.phase) * b.wobbleAmp;
      
      // Bubble outer circle
      ctx.beginPath();
      ctx.arc(wobbleX, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224, 242, 254, ${b.opacity * 0.4})`;
      ctx.fill();

      // Bubble stroke
      ctx.strokeStyle = `rgba(255, 255, 255, ${b.opacity * 0.75})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Bubble highlight glint
      ctx.beginPath();
      ctx.arc(wobbleX - b.radius * 0.35, b.y - b.radius * 0.35, b.radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${b.opacity * 0.85})`;
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render the brown wooden pirate chest with open lid, brass bands, and golden treasure glow
   */
  public renderChest(chest: Chest, time: number) {
    const ctx = this.ctx;
    const { x, y, width, height, tilt, bounce } = chest;

    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(tilt);
    const bounceY = Math.sin(bounce) * 6;
    ctx.translate(-width / 2, -height / 2 + bounceY);

    // 1. Soft Shadow on Seabed
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(width / 2, height + 8, width * 0.52, 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.filter = 'blur(4px)';
    ctx.fill();
    ctx.restore();

    // 2. Interior Golden Treasure Glow (shining out of the open chest)
    ctx.save();
    const glowGrad = ctx.createRadialGradient(
      width / 2, height * 0.2, 5,
      width / 2, height * 0.1, width * 0.65
    );
    glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)'); // Bright gold light
    glowGrad.addColorStop(0.35, 'rgba(234, 179, 8, 0.65)');
    glowGrad.addColorStop(0.7, 'rgba(217, 119, 6, 0.25)');
    glowGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.2, width * 0.55, height * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Open Chest Lid (Tilted back top)
    const lidHeight = height * 0.36;
    ctx.save();
    // Lid back interior
    ctx.fillStyle = '#451a03'; // Dark interior wood
    ctx.beginPath();
    ctx.ellipse(width / 2, 4, width * 0.46, lidHeight * 0.5, 0, Math.PI, 0);
    ctx.fill();

    // Lid wooden rim
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(width / 2, 0, width * 0.48, lidHeight * 0.45, 0, Math.PI, 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#b45309';
    ctx.stroke();
    ctx.fill();

    // Gold brass bands on lid
    const bandPositions = [width * 0.2, width * 0.5, width * 0.8];
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    bandPositions.forEach(bx => {
      ctx.fillRect(bx - 4, -lidHeight * 0.4, 8, lidHeight * 0.45);
      ctx.strokeRect(bx - 4, -lidHeight * 0.4, 8, lidHeight * 0.45);
      // Rivet dot
      ctx.beginPath();
      ctx.arc(bx, -lidHeight * 0.2, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fef08a';
      ctx.fill();
    });
    ctx.restore();

    // 4. Main Wooden Chest Box Body
    const bodyY = height * 0.26;
    const bodyH = height * 0.74;

    // Wood Planks Body Gradient
    const woodGrad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
    woodGrad.addColorStop(0, '#92400e'); // Rich oak brown
    woodGrad.addColorStop(0.5, '#78350f');
    woodGrad.addColorStop(1, '#451a03'); // Darker bottom wood

    ctx.save();
    // Rounded bottom chest body
    ctx.beginPath();
    ctx.roundRect(0, bodyY, width, bodyH, [4, 4, 12, 12]);
    ctx.fillStyle = woodGrad;
    ctx.fill();

    // Wood plank horizontal separation lines
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    const plankH = bodyH / 3;
    for (let p = 1; p < 3; p++) {
      ctx.beginPath();
      ctx.moveTo(3, bodyY + p * plankH);
      ctx.lineTo(width - 3, bodyY + p * plankH);
      ctx.stroke();
    }

    // Wood grain highlights
    ctx.strokeStyle = 'rgba(254, 215, 170, 0.25)';
    ctx.lineWidth = 1;
    for (let p = 0; p < 3; p++) {
      ctx.beginPath();
      ctx.moveTo(6, bodyY + p * plankH + 3);
      ctx.lineTo(width - 6, bodyY + p * plankH + 3);
      ctx.stroke();
    }

    // 5. Golden / Brass Heavy Bands & Corner Brackets
    ctx.fillStyle = '#f59e0b'; // Brass
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1.5;

    // Left and Right corner reinforcement bands
    const bandW = 9;
    // Left band
    ctx.fillRect(0, bodyY, bandW, bodyH);
    ctx.strokeRect(0, bodyY, bandW, bodyH);
    // Right band
    ctx.fillRect(width - bandW, bodyY, bandW, bodyH);
    ctx.strokeRect(width - bandW, bodyY, bandW, bodyH);
    // Center vertical band
    ctx.fillRect(width / 2 - bandW / 2, bodyY, bandW, bodyH);
    ctx.strokeRect(width / 2 - bandW / 2, bodyY, bandW, bodyH);

    // Top horizontal rim band
    ctx.fillRect(0, bodyY, width, 7);
    ctx.strokeRect(0, bodyY, width, 7);

    // Brass rivets along the bands
    ctx.fillStyle = '#fef08a';
    const rivetYs = [bodyY + 4, bodyY + plankH, bodyY + plankH * 2, bodyY + bodyH - 6];
    [bandW / 2, width / 2, width - bandW / 2].forEach(rx => {
      rivetYs.forEach(ry => {
        ctx.beginPath();
        ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
    });

    // 6. Pirate Keyhole Plate & Golden Latch (in the center)
    const latchW = 18;
    const latchH = 19;
    const latchX = width / 2 - latchW / 2;
    const latchY = bodyY + 4;

    // Golden lock escutcheon plate
    const lockGrad = ctx.createLinearGradient(latchX, latchY, latchX, latchY + latchH);
    lockGrad.addColorStop(0, '#fef08a');
    lockGrad.addColorStop(0.5, '#f59e0b');
    lockGrad.addColorStop(1, '#b45309');
    ctx.fillStyle = lockGrad;
    ctx.beginPath();
    ctx.roundRect(latchX, latchY, latchW, latchH, 3);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Keyhole
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(width / 2, latchY + 6, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(width / 2 - 2, latchY + 6);
    ctx.lineTo(width / 2 + 2, latchY + 6);
    ctx.lineTo(width / 2 + 2.6, latchY + 13);
    ctx.lineTo(width / 2 - 2.6, latchY + 13);
    ctx.closePath();
    ctx.fill();

    // 7. Shiny glint sparkle on chest latch
    const sparklePhase = Math.sin(time * 5);
    if (sparklePhase > 0.8) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(latchX + 2, latchY + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  /**
   * Render individual coin with soft glow, 3D tilt, and distinctive coin identity
   */
  public renderCoin(coin: Coin, time: number) {
    const ctx = this.ctx;
    const { x, y, radius, type, wobblePhase, rotation, missed, sinkTimer } = coin;

    ctx.save();
    ctx.translate(x, y);

    // If missed and sinking into sand, fade out
    if (missed) {
      ctx.globalAlpha = Math.max(0, 1 - sinkTimer);
    }

    // 1. Soft Glow around the coin (Prompt requirement: "Coins should have a soft glow and a slight float animation")
    ctx.save();
    const glowRadius = radius * 2.2;
    const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.4, 0, 0, glowRadius);

    if (type === 'diamond') {
      glowGrad.addColorStop(0, 'rgba(186, 230, 253, 0.85)'); // Azure glow
      glowGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.45)');
      glowGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    } else if (type === 'crested') {
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)'); // Warm amber/crimson-gold glow
      glowGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.5)');
      glowGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    } else {
      glowGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)'); // Pure gold glow
      glowGrad.addColorStop(0.5, 'rgba(250, 204, 21, 0.4)');
      glowGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    }

    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. 3D Float / Spin Animation (horizontal compression + angle tilt)
    const scaleX = 0.65 + 0.35 * Math.cos(wobblePhase);
    const tiltAngle = Math.sin(wobblePhase * 0.7) * 0.22;
    ctx.rotate(tiltAngle);
    ctx.scale(scaleX, 1);

    // Render Coin Base by Type
    if (type === 'diamond') {
      this.renderDiamondCoin(radius, time + rotation);
    } else if (type === 'crested') {
      this.renderCrestedCoin(radius, time + rotation);
    } else {
      this.renderNormalGoldCoin(radius, time + rotation);
    }

    ctx.restore();
  }

  /**
   * Normal Gold Coin (1 pt)
   */
  private renderNormalGoldCoin(radius: number, time: number) {
    const ctx = this.ctx;

    // Outer Rim Rim
    const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    rimGrad.addColorStop(0, '#fef08a');
    rimGrad.addColorStop(0.3, '#facc15');
    rimGrad.addColorStop(0.7, '#ca8a04');
    rimGrad.addColorStop(1, '#854d0e');

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.strokeStyle = '#a16207';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner Concentric Disc
    const innerRadius = radius * 0.78;
    const innerGrad = ctx.createRadialGradient(-radius * 0.2, -radius * 0.2, 1, 0, 0, innerRadius);
    innerGrad.addColorStop(0, '#fef9c3');
    innerGrad.addColorStop(0.4, '#eab308');
    innerGrad.addColorStop(1, '#a16207');

    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGrad;
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Embossed Star Symbol in Center
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 1;
    this.drawStar(0, 0, 5, innerRadius * 0.55, innerRadius * 0.25);
    ctx.fill();
    ctx.stroke();

    // Diagonal Specular Reflection Sweep
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.clip();
    const sheenX = Math.sin(time * 2) * (radius * 1.5);
    ctx.rotate(0.6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillRect(sheenX - 3, -radius, 6, radius * 2);
    ctx.restore();
  }

  /**
   * Crested Gold Coin (3 pts) - Antique royal gold coin with heraldic crown/anchor & ruby center
   */
  private renderCrestedCoin(radius: number, time: number) {
    const ctx = this.ctx;

    // Scalloped Ornate Outer Border
    const rimGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    rimGrad.addColorStop(0, '#fde047');
    rimGrad.addColorStop(0.3, '#eab308');
    rimGrad.addColorStop(0.7, '#b45309');
    rimGrad.addColorStop(1, '#78350f');

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Ornate beaded ring
    const beadRadius = radius * 0.82;
    const numBeads = 12;
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < numBeads; i++) {
      const angle = (i * Math.PI * 2) / numBeads;
      const bx = Math.cos(angle) * beadRadius;
      const by = Math.sin(angle) * beadRadius;
      ctx.beginPath();
      ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Inner Crest Shield
    const innerRadius = radius * 0.65;
    const crestGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, innerRadius);
    crestGrad.addColorStop(0, '#fef08a');
    crestGrad.addColorStop(0.6, '#d97706');
    crestGrad.addColorStop(1, '#78350f');

    ctx.beginPath();
    ctx.arc(0, 0, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = crestGrad;
    ctx.fill();

    // Royal Crest: Stylized Golden Crown Emblem
    ctx.fillStyle = '#fef9c3';
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cw = innerRadius * 0.8;
    const ch = innerRadius * 0.6;
    ctx.moveTo(-cw / 2, ch / 3);
    ctx.lineTo(cw / 2, ch / 3);
    ctx.lineTo(cw / 2, -ch / 3);
    ctx.lineTo(cw / 4, 0);
    ctx.lineTo(0, -ch / 2);
    ctx.lineTo(-cw / 4, 0);
    ctx.lineTo(-cw / 2, -ch / 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sparkling Ruby Gem in Center
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
    const rubyGrad = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, radius * 0.2);
    rubyGrad.addColorStop(0, '#fecdd3');
    rubyGrad.addColorStop(0.4, '#e11d48');
    rubyGrad.addColorStop(1, '#881337');
    ctx.fillStyle = rubyGrad;
    ctx.fill();
    ctx.strokeStyle = '#ffe4e6';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /**
   * Diamond Coin (5 pts) - Crystalline multifaceted medallion
   */
  private renderDiamondCoin(radius: number, time: number) {
    const ctx = this.ctx;

    // Prismatic crystalline disc base
    const prismGrad = ctx.createLinearGradient(-radius, -radius, radius, radius);
    prismGrad.addColorStop(0, '#ffffff');
    prismGrad.addColorStop(0.2, '#e0f2fe');
    prismGrad.addColorStop(0.5, '#38bdf8');
    prismGrad.addColorStop(0.8, '#0284c7');
    prismGrad.addColorStop(1, '#0c4a6e');

    // Octagonal Gem Shape
    ctx.beginPath();
    const sides = 8;
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides - Math.PI / 8;
      const dx = Math.cos(angle) * radius;
      const dy = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.closePath();
    ctx.fillStyle = prismGrad;
    ctx.fill();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Internal Diamond Facets
    const innerRadius = radius * 0.65;
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides - Math.PI / 8;
      const dx = Math.cos(angle) * innerRadius;
      const dy = Math.sin(angle) * innerRadius;
      if (i === 0) ctx.moveTo(dx, dy);
      else ctx.lineTo(dx, dy);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Facet connecting lines from outer to inner corners
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides - Math.PI / 8;
      const ox = Math.cos(angle) * radius;
      const oy = Math.sin(angle) * radius;
      const ix = Math.cos(angle) * innerRadius;
      const iy = Math.sin(angle) * innerRadius;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ix, iy);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.stroke();
    }

    // Center Diamond Brilliant Core
    const centerSize = radius * 0.38;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -centerSize);
    ctx.lineTo(centerSize * 0.9, 0);
    ctx.lineTo(0, centerSize);
    ctx.lineTo(-centerSize * 0.9, 0);
    ctx.closePath();
    ctx.fill();

    // Prismatic Light Flare Cross
    const flareLen = radius * 0.5 + Math.sin(time * 6) * 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-flareLen, 0);
    ctx.lineTo(flareLen, 0);
    ctx.moveTo(0, -flareLen);
    ctx.lineTo(0, flareLen);
    ctx.stroke();
  }

  /**
   * Helper to draw a star
   */
  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
    const ctx = this.ctx;
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  /**
   * Render particles (bubbles, sparkles, splashes)
   */
  public renderParticles(particles: Particle[]) {
    const ctx = this.ctx;

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'bubble') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224, 242, 254, 0.5)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (p.type === 'sparkle') {
        // 4-pointed star sparkle
        ctx.fillStyle = p.color;
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.quadraticCurveTo(p.x, p.y, p.x + s, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + s);
        ctx.quadraticCurveTo(p.x, p.y, p.x - s, p.y);
        ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - s);
        ctx.closePath();
        ctx.fill();
      } else {
        // Splash drop
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  /**
   * Render floating score popups (+1, +3, +5, COMBO!)
   */
  public renderFloatingTexts(texts: FloatingText[]) {
    const ctx = this.ctx;

    for (const t of texts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.font = '800 24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text outline for high legibility
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, t.x, t.y);

      // Text fill
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);

      ctx.restore();
    }
  }

  /**
   * Render clear purple octopus sprite that slowly floats across the screen
   */
  public renderOctopus(octopus: Octopus, time: number) {
    if (!octopus.active) return;

    const ctx = this.ctx;
    const { x, y, width, height, direction, eatNext, chompTimer } = octopus;
    const cx = x + width / 2;
    const cy = y + height / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Flip horizontally when moving left
    if (direction === -1) {
      ctx.scale(-1, 1);
    }

    // Swimming gentle wave tilt & squish
    const swimWave = Math.sin(time * 3);
    const tilt = swimWave * 0.08;
    const squishY = 1 + Math.cos(time * 3) * 0.04;
    ctx.rotate(tilt);
    ctx.scale(1, squishY);

    // 1. Soft Purple Glow around octopus
    ctx.save();
    const glowRadius = width * 0.85;
    const glowGrad = ctx.createRadialGradient(0, 0, width * 0.2, 0, 0, glowRadius);
    glowGrad.addColorStop(0, 'rgba(192, 132, 252, 0.55)');
    glowGrad.addColorStop(0.5, 'rgba(147, 51, 234, 0.35)');
    glowGrad.addColorStop(1, 'rgba(126, 34, 206, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Animated Tentacles behind/below body
    const tentacleCount = 6;
    const tentacleBaseY = height * 0.12;
    const tentacleSpacing = (width * 0.72) / (tentacleCount - 1);
    const startX = -width * 0.36;

    for (let i = 0; i < tentacleCount; i++) {
      const tx = startX + i * tentacleSpacing;
      const tentaclePhase = time * 3.5 + i * 0.7;
      const sway1 = Math.sin(tentaclePhase) * 12;
      const sway2 = Math.cos(tentaclePhase * 0.8) * 16;
      const tentacleLen = height * 0.48 + (i % 2 === 0 ? 6 : -4);

      ctx.save();
      ctx.strokeStyle = '#7e22ce'; // Rich purple
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, tentacleBaseY);
      ctx.quadraticCurveTo(
        tx + sway1 - 6,
        tentacleBaseY + tentacleLen * 0.5,
        tx + sway2 - 10,
        tentacleBaseY + tentacleLen
      );
      ctx.stroke();

      // Inner lighter tentacle stroke
      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Suction cups along tentacle
      ctx.fillStyle = '#f3e8ff';
      const cupX1 = tx + sway1 * 0.4 - 4;
      const cupY1 = tentacleBaseY + tentacleLen * 0.45;
      ctx.beginPath();
      ctx.arc(cupX1, cupY1, 2, 0, Math.PI * 2);
      ctx.fill();

      const cupX2 = tx + sway2 * 0.7 - 7;
      const cupY2 = tentacleBaseY + tentacleLen * 0.78;
      ctx.beginPath();
      ctx.arc(cupX2, cupY2, 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 3. Bulbous Purple Head
    const headW = width * 0.42;
    const headH = height * 0.42;

    const headGrad = ctx.createRadialGradient(-headW * 0.25, -headH * 0.3, 4, 0, -headH * 0.1, headW * 1.2);
    headGrad.addColorStop(0, '#e9d5ff'); // Light lilac highlight
    headGrad.addColorStop(0.3, '#c084fc'); // Vibrant purple
    headGrad.addColorStop(0.7, '#9333ea');
    headGrad.addColorStop(1, '#6b21a8'); // Deep underwater purple

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, -headH * 0.1, headW, headH, 0, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.fill();
    ctx.strokeStyle = '#581c87';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Cute lavender freckles on forehead
    ctx.fillStyle = 'rgba(233, 213, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(-headW * 0.3, -headH * 0.5, 2.5, 0, Math.PI * 2);
    ctx.arc(0, -headH * 0.65, 3, 0, Math.PI * 2);
    ctx.arc(headW * 0.35, -headH * 0.45, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Large Expressive Cartoon Eyes
    const eyeOffsetX = headW * 0.35;
    const eyeY = -headH * 0.1;
    const eyeRadius = 9;

    [-eyeOffsetX, eyeOffsetX].forEach((ex, idx) => {
      // White sclera
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, eyeRadius, eyeRadius * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Pupil looking forward/slightly down
      const pupilX = ex + 2;
      const pupilY = eyeY + 1.5;
      ctx.fillStyle = '#1e1b4b';
      ctx.beginPath();
      ctx.arc(pupilX, pupilY, 4.2, 0, Math.PI * 2);
      ctx.fill();

      // Sparkling eye glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pupilX - 1.5, pupilY - 1.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pupilX + 1.5, pupilY + 1.5, 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Rosy cute cheeks under eyes
      ctx.fillStyle = 'rgba(244, 114, 182, 0.5)';
      ctx.beginPath();
      ctx.ellipse(ex + (idx === 0 ? -2 : 2), eyeY + eyeRadius + 3, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 5. Mouth / Chomp Animation
    ctx.save();
    if (chompTimer > 0) {
      // Mouth OPEN CHOMP!
      ctx.fillStyle = '#4c0519';
      ctx.beginPath();
      ctx.ellipse(0, headH * 0.18, 7.5, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Little teeth / beak
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(-3, headH * 0.18 - 6);
      ctx.lineTo(0, headH * 0.18 - 3);
      ctx.lineTo(3, headH * 0.18 - 6);
      ctx.closePath();
      ctx.fill();
    } else {
      // Cute happy smiling mouth
      ctx.strokeStyle = '#581c87';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, headH * 0.12, 5.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.restore();

    // 6. Overhead Status Indicator: Next Eat vs Pass
    ctx.save();
    // Neutralize direction flip for readable text
    if (direction === -1) {
      ctx.scale(-1, 1);
    }
    ctx.font = '700 10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const tagY = -headH - 14;
    const tagText = eatNext ? '😋 EATS NEXT COIN' : '💨 LETS NEXT PASS';
    const tagBg = eatNext ? 'rgba(147, 51, 234, 0.85)' : 'rgba(56, 189, 248, 0.85)';

    ctx.fillStyle = tagBg;
    ctx.beginPath();
    ctx.roundRect(-54, tagY - 9, 108, 18, 9);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(tagText, 0, tagY);
    ctx.restore();

    ctx.restore();
  }
}
