/**
 * field.js — Lacrosse field drawing
 * Women's lacrosse: 12-meter fan, 8-meter arc with hash marks, crease, goal box
 */

const Field = (() => {

  function draw(ctx, CW, CH, courtMode) {
    // Grass gradient
    const g = ctx.createLinearGradient(0, 0, 0, CH);
    g.addColorStop(0, '#2c7a2c');
    g.addColorStop(0.5, '#357d35');
    g.addColorStop(1, '#2c7a2c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);

    // Turf stripe effect
    const stripes = courtMode === 'full' ? 12 : 10;
    for (let i = 0; i < stripes; i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.04)';
        ctx.fillRect(i * CW / stripes, 0, CW / stripes, CH);
      }
    }

    if (courtMode === 'half') {
      drawHalfCourt(ctx, CW, CH);
    } else {
      drawFullCourt(ctx, CW, CH);
    }
  }

  function drawHalfCourt(ctx, CW, CH) {
    const pad = 0.035;
    const lx = CW * pad, rx = CW * (1 - pad);
    const ty = CH * pad, by = CH * (1 - pad);
    const fw = rx - lx, fh = by - ty;

    // Field boundary
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(lx, ty, fw, fh);

    // Goal center: top edge, horizontally centered
    // Women's lacrosse — goal on end line (top), field extends downward
    const GX = CW / 2;
    const GY = ty; // goal sits ON the top boundary line

    // Scale from field height (represents ~55 yards in half court)
    const scale = fh;
    const fan12R = scale * 0.38;   // 12-meter fan radius
    const arc8R  = scale * 0.245;  // 8-meter arc
    const creaseR = scale * 0.082; // goal crease (~2.6m radius)
    const goalW  = scale * 0.038;  // half-width of goal (3ft each side = 6ft total)
    const goalDepth = scale * 0.025;

    // ─── 12-METER FAN ───
    // Full semicircle from goal on top end line, opening toward midfield (downward)
    ctx.beginPath();
    ctx.arc(GX, GY, fan12R, 0, Math.PI); // 0→π = right to left, bottom semicircle
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Side lines connecting fan ends to top boundary
    // (the fan connects to top line at GX ± fan12R, which are inside the field)
    // Draw vertical lines from fan endpoints up to top edge
    ctx.beginPath();
    ctx.moveTo(GX - fan12R, GY);
    ctx.lineTo(GX - fan12R, ty);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(GX + fan12R, GY);
    ctx.lineTo(GX + fan12R, ty);
    ctx.stroke();

    // ─── 8-METER ARC ───
    // Arc from goal with 45° cutoff lines on each side
    const arcCutAngle = Math.PI * 0.25; // 45° = π/4 from horizontal
    // Arc spans from arcCutAngle to π-arcCutAngle (the bottom semicircle section)
    ctx.beginPath();
    ctx.arc(GX, GY, arc8R, arcCutAngle, Math.PI - arcCutAngle);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 45° cutoff lines (from goal point to arc start)
    ctx.beginPath();
    ctx.moveTo(GX, GY);
    ctx.lineTo(GX + arc8R * Math.cos(arcCutAngle), GY + arc8R * Math.sin(arcCutAngle));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(GX, GY);
    ctx.lineTo(GX - arc8R * Math.cos(arcCutAngle), GY + arc8R * Math.sin(arcCutAngle));
    ctx.stroke();

    // Hash marks along 8-meter arc
    const hashCount = 10;
    const arcStart = arcCutAngle;
    const arcEnd = Math.PI - arcCutAngle;
    const arcSpan = arcEnd - arcStart;
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= hashCount; i++) {
      const angle = arcStart + arcSpan * (i / hashCount);
      const hLen = scale * 0.016;
      const innerR = arc8R - hLen / 2;
      const outerR = arc8R + hLen / 2;
      ctx.beginPath();
      ctx.moveTo(GX + innerR * Math.cos(angle), GY + innerR * Math.sin(angle));
      ctx.lineTo(GX + outerR * Math.cos(angle), GY + outerR * Math.sin(angle));
      ctx.stroke();
    }

    // ─── GOAL CREASE (circle) ───
    ctx.beginPath();
    ctx.arc(GX, GY, creaseR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ─── GOAL BOX (rectangle on top end line) ───
    ctx.beginPath();
    ctx.rect(GX - goalW, GY, goalW * 2, goalDepth);
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 2.8;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();

    // ─── MIDFIELD RESTRAINING LINE ───
    const restrainY = ty + fh * 0.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(lx, restrainY);
    ctx.lineTo(rx, restrainY);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);

    // Center spot
    ctx.beginPath();
    ctx.arc(CW / 2, restrainY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();

    ctx.restore();

    // Store goal reference for external use
    Field._goalX = GX;
    Field._goalY = GY;
  }

  function drawFullCourt(ctx, CW, CH) {
    const lx = CW * 0.03, rx = CW * 0.97;
    const ty = CH * 0.04, by = CH * 0.96;
    const fw = rx - lx, fh = by - ty;

    ctx.save();

    // Boundary
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(lx, ty, fw, fh);

    // Center line
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(lx, CH / 2); ctx.lineTo(rx, CH / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(CW / 2, CH / 2, fw * 0.05, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot
    ctx.beginPath();
    ctx.arc(CW / 2, CH / 2, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    // Both goals (top and bottom end lines)
    drawGoalSection(ctx, CW / 2, ty, fh, 'top', fw, fh);
    drawGoalSection(ctx, CW / 2, by, fh, 'bottom', fw, fh);

    ctx.restore();
  }

  function drawGoalSection(ctx, GX, GY, fh, side, fw, fullFH) {
    // Scale relative to half the field height
    const scale = fullFH / 2;
    const fan12R = scale * 0.38;
    const arc8R  = scale * 0.245;
    const creaseR = scale * 0.082;
    const goalW  = scale * 0.038;
    const goalDepth = scale * 0.025;
    const arcCutAngle = Math.PI * 0.25;

    const isTop = side === 'top';
    // For top goal: arcs open downward (0 to π). For bottom goal: arcs open upward (π to 2π)
    const arcA1 = isTop ? 0 : Math.PI;
    const arcA2 = isTop ? Math.PI : Math.PI * 2;
    const cutSign = isTop ? 1 : -1;

    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = 1.8;

    // 12m fan
    ctx.beginPath();
    ctx.arc(GX, GY, fan12R, arcA1, arcA2, !isTop);
    ctx.stroke();

    // 8m arc
    const a1 = isTop ? arcCutAngle : Math.PI + arcCutAngle;
    const a2 = isTop ? Math.PI - arcCutAngle : 2 * Math.PI - arcCutAngle;
    ctx.beginPath();
    ctx.arc(GX, GY, arc8R, a1, a2, !isTop);
    ctx.stroke();

    // Cutoff lines
    ctx.beginPath();
    ctx.moveTo(GX, GY);
    ctx.lineTo(GX + arc8R * Math.cos(a1), GY + arc8R * Math.sin(a1));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(GX, GY);
    ctx.lineTo(GX + arc8R * Math.cos(a2), GY + arc8R * Math.sin(a2));
    ctx.stroke();

    // Hash marks
    const hashCount = 8;
    const span = isTop ? (Math.PI - 2 * arcCutAngle) : (Math.PI - 2 * arcCutAngle);
    ctx.lineWidth = 1.8;
    for (let i = 0; i <= hashCount; i++) {
      const angle = a1 + span * (i / hashCount);
      const hLen = scale * 0.016;
      ctx.beginPath();
      ctx.moveTo(GX + (arc8R - hLen/2)*Math.cos(angle), GY + (arc8R - hLen/2)*Math.sin(angle));
      ctx.lineTo(GX + (arc8R + hLen/2)*Math.cos(angle), GY + (arc8R + hLen/2)*Math.sin(angle));
      ctx.stroke();
    }

    // Crease
    ctx.strokeStyle = 'rgba(255,255,255,0.88)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(GX, GY, creaseR, 0, Math.PI * 2);
    ctx.stroke();

    // Goal box
    const boxY = isTop ? GY : GY - goalDepth;
    ctx.beginPath();
    ctx.rect(GX - goalW, boxY, goalW * 2, goalDepth);
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fill();
  }

  return { draw };
})();
