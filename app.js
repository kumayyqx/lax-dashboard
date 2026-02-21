/**
 * app.js — Lacrosse Whiteboard main application
 */

const App = (() => {

  // ── STATE ──────────────────────────────────────────────────
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  const TEAM_COLORS = [
    ['#e74c3c', '#c0392b', '#ff6b6b', '#ff8e53', '#e67e22'],
    ['#3498db', '#2980b9', '#1abc9c', '#9b59b6', '#2ecc71'],
  ];

  let CW, CH;
  let courtMode = 'half';
  let tool = 'none';       // none | draw | arrow | erase
  let addMode = 'player';  // player | ball
  let teamColors = ['#e74c3c', '#3498db'];
  let activeTeam = 1;

  let players = [];
  let balls = [];
  let drawings = [];
  let selId = null;

  let dragging = false, dox = 0, doy = 0;
  let isDrawing = false, curStroke = null;
  let arrowSt = null;

  let pathRec = false;
  let curDragPath = [];

  let videoRec = false, mediaRec = null, vidChunks = [];
  let playbackActive = false;
  let nid = 1;

  const PR = 17; // player radius
  const BR = 9;  // ball radius

  // ── RESIZE ─────────────────────────────────────────────────
  function resizeCanvas() {
    const wrap = document.getElementById('cwrap');
    const mw = wrap.clientWidth - 20;
    const mh = wrap.clientHeight - 20;
    const ratio = courtMode === 'full' ? (110 / 60) : (100 / 75);
    let w = mw, h = mw / ratio;
    if (h > mh) { h = mh; w = mh * ratio; }
    canvas.width = Math.floor(w);
    canvas.height = Math.floor(h);
    CW = canvas.width; CH = canvas.height;
  }

  // ── RENDER ─────────────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, CW, CH);
    Field.draw(ctx, CW, CH, courtMode);

    // Draw recorded paths
    [...players, ...balls].forEach(obj => {
      if (!obj.path || obj.path.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(obj.path[0].x, obj.path[0].y);
      obj.path.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.strokeStyle = (obj.color || '#f9a825') + '99';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (obj.path.length >= 2) {
        const a = obj.path[obj.path.length - 1];
        const b = obj.path[obj.path.length - 2];
        drawArrowHead(b.x, b.y, a.x, a.y, (obj.color || '#f9a825') + 'cc', 9);
      }
    });

    // Draw annotations
    drawings.forEach(d => {
      if (d.type === 'stroke') {
        if (d.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(d.points[0].x, d.points[0].y);
        d.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
        ctx.strokeStyle = d.color; ctx.lineWidth = d.width;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.setLineDash([]); ctx.stroke();
      } else if (d.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1); ctx.lineTo(d.x2, d.y2);
        ctx.strokeStyle = d.color; ctx.lineWidth = 2.5;
        ctx.lineCap = 'round'; ctx.stroke();
        drawArrowHead(d.x1, d.y1, d.x2, d.y2, d.color, 13);
      }
    });

    // Draw balls
    balls.forEach(drawBall);
    // Draw players
    players.forEach(drawPlayer);
  }

  function drawBall(b) {
    ctx.beginPath();
    ctx.arc(b.x + 1.5, b.y + 1.5, BR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();

    const g = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BR);
    g.addColorStop(0, '#fffde7');
    g.addColorStop(1, '#f9a825');
    ctx.beginPath();
    ctx.arc(b.x, b.y, BR, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = b.id === selId ? '#fff' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = b.id === selId ? 2.2 : 1.2;
    ctx.stroke();
    ctx.font = `${BR + 3}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🥍', b.x, b.y + 1);
  }

  function drawPlayer(p) {
    const sel = p.id === selId;
    // Shadow
    ctx.beginPath();
    ctx.arc(p.x + 1.5, p.y + 1.5, PR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fill();
    // Body
    ctx.beginPath();
    ctx.arc(p.x, p.y, PR, 0, Math.PI * 2);
    ctx.fillStyle = p.color; ctx.fill();
    // Selection ring
    if (sel) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR + 5, 0, Math.PI * 2);
      ctx.strokeStyle = '#e8c84a'; ctx.lineWidth = 2.5; ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    // Number
    ctx.fillStyle = contrast(p.color);
    ctx.font = `bold ${p.label.length > 1 ? 10 : 12}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.label, p.x, p.y + 1);
    // Ball badge
    if (p.hasBall) {
      const bx = p.x + PR - 2, by = p.y - PR + 2;
      ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#f9a825'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.font = 'bold 7px sans-serif'; ctx.fillStyle = '#000';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('B', bx, by + 0.5);
    }
    // Team indicator dot
    ctx.beginPath();
    ctx.arc(p.x, p.y + PR + 4, 3, 0, Math.PI * 2);
    ctx.fillStyle = p.teamColor + 'cc'; ctx.fill();
  }

  function drawArrowHead(x1, y1, x2, y2, color, sz) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - sz * Math.cos(ang - .38), y2 - sz * Math.sin(ang - .38));
    ctx.lineTo(x2 - sz * Math.cos(ang + .38), y2 - sz * Math.sin(ang + .38));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  function contrast(hex) {
    if (!hex || hex.length < 7) return '#111';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * .299 + g * .587 + b * .114) > 145 ? '#111' : '#fff';
  }

  // ── COURT ──────────────────────────────────────────────────
  function setCourt(m) {
    courtMode = m;
    document.getElementById('btn-half').classList.toggle('active', m === 'half');
    document.getElementById('btn-full').classList.toggle('active', m === 'full');
    resizeCanvas(); render();
  }

  // ── TOOLS ──────────────────────────────────────────────────
  function setTool(t) {
    tool = tool === t ? 'none' : t;
    ['draw', 'arrow', 'erase'].forEach(n =>
      document.getElementById('btn-' + n)?.classList.toggle('on', tool === n)
    );
    updateTip(); render();
  }

  function setAddMode(m) {
    addMode = m;
    tool = 'none';
    ['draw', 'arrow', 'erase'].forEach(n =>
      document.getElementById('btn-' + n)?.classList.remove('on')
    );
    document.getElementById('btn-addplayer')?.classList.toggle('on', m === 'player');
    updateTip();
  }

  function updateTip() {
    const el = document.getElementById('tip');
    if (!el) return;
    if (tool === 'draw') el.textContent = 'Drag to draw freehand';
    else if (tool === 'arrow') el.textContent = 'Drag to draw a movement arrow';
    else if (tool === 'erase') el.textContent = 'Click a line to erase it';
    else if (addMode === 'ball') el.textContent = 'Click field to place the ball';
    else el.textContent = pathRec
      ? '🔴 Path REC on — drag players or ball to record movement'
      : 'Click to place player · Drag to move · Enable 🎬 Record Path to trace';
  }

  // ── TEAMS ──────────────────────────────────────────────────
  function selectTeam(n) {
    activeTeam = n;
    document.getElementById('tsel1').classList.toggle('on', n === 1);
    document.getElementById('tsel2').classList.toggle('on', n === 2);
  }

  function buildColorGrids() {
    TEAM_COLORS.forEach((colors, ti) => {
      const grid = document.getElementById('cgrid' + (ti + 1));
      if (!grid) return;
      grid.innerHTML = '';
      colors.forEach(c => {
        const s = document.createElement('div');
        s.className = 'sw' + (c === teamColors[ti] ? ' sel' : '');
        s.style.background = c;
        s.onclick = () => {
          teamColors[ti] = c;
          grid.querySelectorAll('.sw').forEach(el => el.classList.remove('sel'));
          s.classList.add('sel');
          document.getElementById('t' + (ti + 1) + 'dot').style.background = c;
        };
        grid.appendChild(s);
      });
    });
  }

  // ── PATH RECORDING ─────────────────────────────────────────
  function togglePathRec() {
    pathRec = !pathRec;
    const btn = document.getElementById('btn-pathrec');
    btn?.classList.toggle('on', pathRec);
    btn && (btn.textContent = pathRec ? '⏹ Path' : '🎬');
    document.getElementById('pathbadge')?.classList.toggle('show', pathRec);
    updateTip();
  }

  // ── PLAYBACK ───────────────────────────────────────────────
  function playPaths() {
    if (playbackActive) return;
    const allObjs = [...players, ...balls].filter(o => o.path && o.path.length > 1);
    if (!allObjs.length) {
      alert('No paths recorded yet.\n\nEnable "🎬 Record Path" then drag players or the ball.');
      return;
    }
    const orig = allObjs.map(o => ({ id: o.id, x: o.x, y: o.y }));
    allObjs.forEach(o => { o.x = o.path[0].x; o.y = o.path[0].y; });
    const maxLen = Math.max(...allObjs.map(o => o.path.length));
    const spd = Math.max(1, Math.floor(maxLen / 150));
    let f = 0;
    playbackActive = true;

    function step() {
      if (f >= maxLen) {
        orig.forEach(o => {
          const found = [...players, ...balls].find(q => q.id === o.id);
          if (found) { found.x = o.x; found.y = o.y; }
        });
        playbackActive = false;
        render(); return;
      }
      allObjs.forEach(o => {
        const i = Math.min(f, o.path.length - 1);
        o.x = o.path[i].x; o.y = o.path[i].y;
      });
      f += spd; render();
      requestAnimationFrame(step);
    }
    step();
  }

  function clearSelPath() {
    if (!selId) return;
    const found = [...players, ...balls].find(o => o.id === selId);
    if (found) { found.path = []; updateList(); render(); }
  }

  function clearAllPaths() {
    [...players, ...balls].forEach(o => o.path = []);
    updateList(); render();
  }

  // ── VIDEO ──────────────────────────────────────────────────
  function toggleVideo() {
    if (!videoRec) startVideo(); else stopVideo();
  }

  function startVideo() {
    try {
      const stream = canvas.captureStream(30);
      vidChunks = [];
      let opts = { mimeType: 'video/webm;codecs=vp9' };
      try { mediaRec = new MediaRecorder(stream, opts); }
      catch (e) { mediaRec = new MediaRecorder(stream); }
      mediaRec.ondataavailable = e => { if (e.data.size > 0) vidChunks.push(e.data); };
      mediaRec.onstop = () => {
        const blob = new Blob(vidChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'lacrosse-play.webm'; a.click();
        URL.revokeObjectURL(url);
      };
      mediaRec.start(100);
      videoRec = true;
      document.getElementById('btn-video').textContent = '⏹';
      document.getElementById('btn-video')?.classList.add('on');
      document.getElementById('recbadge')?.classList.add('show');
    } catch (e) {
      alert('Video recording requires Chrome or Firefox.');
    }
  }

  function stopVideo() {
    if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
    videoRec = false;
    document.getElementById('btn-video').textContent = '⏺';
    document.getElementById('btn-video')?.classList.remove('on');
    document.getElementById('recbadge')?.classList.remove('show');
  }

  // ── CANVAS EVENTS ──────────────────────────────────────────
  function getPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function hitTest(x, y) {
    for (let i = players.length - 1; i >= 0; i--) {
      const p = players[i], dx = x - p.x, dy = y - p.y;
      if (dx * dx + dy * dy <= (PR + 5) ** 2) return { obj: p, type: 'player' };
    }
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i], dx = x - b.x, dy = y - b.y;
      if (dx * dx + dy * dy <= (BR + 6) ** 2) return { obj: b, type: 'ball' };
    }
    return null;
  }

  canvas.addEventListener('mousedown', e => {
    const { x, y } = getPos(e);
    if (tool === 'draw') {
      isDrawing = true;
      curStroke = { type: 'stroke', points: [{ x, y }], color: 'rgba(255,220,50,.9)', width: 2.5 };
      return;
    }
    if (tool === 'arrow') { arrowSt = { x, y }; return; }
    if (tool === 'erase') { eraseAt(x, y); return; }

    const hit = hitTest(x, y);
    if (hit) {
      selId = hit.obj.id;
      dragging = true;
      dox = x - hit.obj.x; doy = y - hit.obj.y;
      curDragPath = [{ x: hit.obj.x, y: hit.obj.y }];
      updateList(); render(); return;
    }

    // Place new object
    if (addMode === 'ball') {
      balls.push({ id: nid++, x, y, isBall: true, color: '#f9a825', path: [] });
      addMode = 'player';
      document.getElementById('btn-addplayer')?.classList.add('on');
    } else {
      const lbl = document.getElementById('pnum').value || String(players.length + 1);
      const tColor = teamColors[activeTeam - 1];
      players.push({ id: nid++, x, y, color: tColor, teamColor: tColor, team: activeTeam, label: lbl, hasBall: false, path: [] });
      selId = players[players.length - 1].id;
    }
    updateList(); render();
  });

  canvas.addEventListener('mousemove', e => {
    const { x, y } = getPos(e);

    if (isDrawing && curStroke) {
      curStroke.points.push({ x, y });
      render();
      ctx.beginPath();
      ctx.moveTo(curStroke.points[0].x, curStroke.points[0].y);
      curStroke.points.forEach(pt => ctx.lineTo(pt.x, pt.y));
      ctx.strokeStyle = curStroke.color; ctx.lineWidth = curStroke.width;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
      return;
    }
    if (arrowSt) {
      render();
      ctx.beginPath(); ctx.moveTo(arrowSt.x, arrowSt.y); ctx.lineTo(x, y);
      ctx.strokeStyle = 'rgba(255,220,50,.9)'; ctx.lineWidth = 2.5;
      ctx.lineCap = 'round'; ctx.stroke();
      drawArrowHead(arrowSt.x, arrowSt.y, x, y, 'rgba(255,220,50,.9)', 13);
      return;
    }
    if (dragging && selId != null) {
      const obj = [...players, ...balls].find(o => o.id === selId);
      if (obj) {
        obj.x = x - dox; obj.y = y - doy;
        if (pathRec) curDragPath.push({ x: obj.x, y: obj.y });
      }
      render();
    }
  });

  canvas.addEventListener('mouseup', e => {
    const { x, y } = getPos(e);
    if (isDrawing && curStroke) {
      if (curStroke.points.length > 1) drawings.push(curStroke);
      isDrawing = false; curStroke = null; render(); return;
    }
    if (arrowSt) {
      if (Math.hypot(x - arrowSt.x, y - arrowSt.y) > 10)
        drawings.push({ type: 'arrow', x1: arrowSt.x, y1: arrowSt.y, x2: x, y2: y, color: 'rgba(255,220,50,.9)' });
      arrowSt = null; render(); return;
    }
    if (dragging && pathRec && selId != null) {
      const obj = [...players, ...balls].find(o => o.id === selId);
      if (obj && curDragPath.length > 1) {
        obj.path = [...(obj.path || []), ...curDragPath];
        updateList();
      }
    }
    curDragPath = []; dragging = false;
  });

  canvas.addEventListener('mouseleave', () => {
    if (isDrawing && curStroke) {
      if (curStroke.points.length > 1) drawings.push(curStroke);
      isDrawing = false; curStroke = null; render();
    }
    if (dragging && pathRec && selId != null) {
      const obj = [...players, ...balls].find(o => o.id === selId);
      if (obj && curDragPath.length > 1) { obj.path = [...(obj.path || []), ...curDragPath]; updateList(); }
    }
    dragging = false; arrowSt = null; curDragPath = [];
  });

  // Touch support
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    canvas.dispatchEvent(new MouseEvent('mousedown', t2m(e)));
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    canvas.dispatchEvent(new MouseEvent('mousemove', t2m(e)));
  }, { passive: false });
  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    canvas.dispatchEvent(new MouseEvent('mouseup', t2m(e)));
  }, { passive: false });

  function t2m(e) {
    const t = e.touches[0] || e.changedTouches[0];
    return { clientX: t.clientX, clientY: t.clientY };
  }

  function eraseAt(x, y) {
    let bi = -1, bd = Infinity;
    drawings.forEach((d, i) => {
      if (d.type === 'stroke') d.points.forEach(pt => {
        const dist = Math.hypot(pt.x - x, pt.y - y);
        if (dist < bd) { bd = dist; bi = i; }
      });
      else if (d.type === 'arrow') {
        const dist = ptSD(x, y, d.x1, d.y1, d.x2, d.y2);
        if (dist < bd) { bd = dist; bi = i; }
      }
    });
    if (bd < 14 && bi >= 0) { drawings.splice(bi, 1); render(); }
  }

  function ptSD(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    if (!dx && !dy) return Math.hypot(px - x1, py - y1);
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  // ── PLAYER ACTIONS ─────────────────────────────────────────
  function toggleBall() {
    if (!selId) return;
    const p = players.find(p => p.id === selId);
    if (!p) return;
    const was = p.hasBall;
    players.forEach(pl => pl.hasBall = false); // only one at a time
    p.hasBall = !was;
    updateList(); render();
  }

  function deleteSel() {
    if (!selId) return;
    players = players.filter(p => p.id !== selId);
    balls = balls.filter(b => b.id !== selId);
    selId = null; updateList(); render();
  }

  function clearLines() { drawings = []; render(); }

  function resetAll() {
    if (!confirm('Reset everything? This will clear all players, balls, and drawings.')) return;
    players = []; balls = []; drawings = []; selId = null;
    updateList(); render();
  }

  // ── PLAYER LIST ────────────────────────────────────────────
  function updateList() {
    document.getElementById('pcnt').textContent = players.length;
    const list = document.getElementById('plist');
    list.innerHTML = '';
    players.forEach(p => {
      const d = document.createElement('div');
      d.className = 'pi' + (p.id === selId ? ' sel' : '');
      const tname = p.team === 1
        ? document.getElementById('t1name').value
        : document.getElementById('t2name').value;
      d.innerHTML = `
        <div class="pd" style="background:${p.color}"></div>
        <span class="plbl">#${p.label} <span style="color:${p.teamColor};font-size:.62rem;opacity:.8">${tname}</span></span>
        ${p.hasBall ? '<span style="font-size:.7rem">🥍</span>' : ''}
        ${p.path && p.path.length > 1 ? '<span style="color:#e8c84a;font-size:.6rem" title="Has recorded path">⬤</span>' : ''}
      `;
      d.onclick = () => { selId = p.id; updateList(); render(); };
      list.appendChild(d);
    });
  }

  // ── KEYBOARD ───────────────────────────────────────────────
  window.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (e.key === 'Delete' || e.key === 'Backspace') deleteSel();
    if (e.key === 'd') setTool('draw');
    if (e.key === 'a') setTool('arrow');
    if (e.key === 'e') setTool('erase');
    if (e.key === 'b') toggleBall();
    if (e.key === 'p') togglePathRec();
    if (e.key === ' ') { e.preventDefault(); playPaths(); }
    if (e.key === '1') selectTeam(1);
    if (e.key === '2') selectTeam(2);
    if (e.key === 'Escape') {
      tool = 'none'; selId = null;
      ['draw', 'arrow', 'erase'].forEach(n => document.getElementById('btn-' + n)?.classList.remove('on'));
      updateList(); render();
    }
  });

  window.addEventListener('resize', () => { resizeCanvas(); render(); });

  // ── INIT ───────────────────────────────────────────────────
  function init() {
    buildColorGrids();
    resizeCanvas();
    updateTip();
    render();
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  // Public API
  return {
    setCourt, setTool, setAddMode, selectTeam,
    togglePathRec, playPaths, clearSelPath, clearAllPaths,
    toggleVideo, toggleBall, deleteSel, clearLines, resetAll,
    init
  };
})();

// ── UI HELPERS ─────────────────────────────────────────────────
const UI = (() => {
  let sidebarVisible = true;

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebarVisible = !sidebarVisible;
    sidebar.classList.toggle('hidden', !sidebarVisible);
    if (overlay) overlay.classList.toggle('show', sidebarVisible && window.innerWidth <= 720);
  }

  function init() {
    // Create overlay for mobile
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.onclick = () => toggleSidebar();
    document.body.appendChild(overlay);

    // On mobile default sidebar hidden
    if (window.innerWidth <= 720) {
      document.getElementById('sidebar')?.classList.add('hidden');
      sidebarVisible = false;
    }
  }

  return { toggleSidebar, init };
})();

// Start everything
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
  App.init();
});
