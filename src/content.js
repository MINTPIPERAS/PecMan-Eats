(function () {
  'use strict';

  var TARGET_W = 50;
  var TARGET_H = 70;
  var SPEED = 2.5;

  var STATE_IDLE = 0;
  var STATE_EATING = 1;
  var STATE_FINISHED = 2;

  var layer = window.DinoCanvasLayer;
  var sampler = window.BgSampler;
  var Pacman = window.Dino;
  var dinoLayer = window.DinoLayer;

  if (!layer || !sampler || !Pacman) return;

  var strips = [];
  var currentStrip = 0;
  var bgColor = null;
  var pacman = null;
  var animFrameId = null;
  var currentState = STATE_IDLE;
  var pacSize = 48;
  var cellW = 50;
  var cellH = 70;
  var startTime = 0;

  function buildStripGrid() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cols = Math.max(2, Math.round(vw / TARGET_W));
    var rows = Math.max(2, Math.round(vh / TARGET_H));

    cellW = vw / cols;
    cellH = vh / rows;

    strips = [];
    for (var ri = 0; ri < rows; ri++) {
      var sy = ri * cellH;
      var cells = [];
      for (var ci = 0; ci < cols; ci++) {
        cells.push({
          x: ci * cellW,
          y: sy,
          w: cellW,
          h: cellH,
          eaten: false
        });
      }
      strips.push({ y: sy, height: cellH, cells: cells });
    }

    pacSize = Math.round(cellH * 0.8);
    if (pacSize < 18) pacSize = 18;
    if (pacSize > 140) pacSize = 140;
  }

  function rectsOverlap(a, b) {
    return !(
      a.x + a.w <= b.x ||
      a.x >= b.x + b.w ||
      a.y + a.h <= b.y ||
      a.y >= b.y + b.h
    );
  }

  function startEating() {
    if (currentState === STATE_EATING) return;

    if (currentState === STATE_FINISHED) {
      dinoLayer.remove();
      window.DinoCanvasLayer.destroy();
    }
    if (currentState === STATE_IDLE) {
      window.DinoCanvasLayer.init();
    }

    bgColor = sampler.samplePageColor(document);
    buildStripGrid();
    startTime = Date.now();

    console.log(
      '[Dinosaur-Eats] grid ' + strips[0].cells.length + 'x' + strips.length +
      ', cell ' + cellW.toFixed(1) + 'x' + cellH.toFixed(1) +
      ', pac ' + pacSize + 'px, speed ' + SPEED
    );

    currentStrip = 0;

    pacman = new Pacman();
    pacman.init(0, 0, pacSize);
    pacman.facingRight = true;

    var strip = strips[0];
    pacman.y = strip.y + (strip.height - pacman.height) / 2;
    pacman.x = -pacman.width;

    dinoLayer.create();

    currentState = STATE_EATING;
    animFrameId = requestAnimationFrame(loop);
    console.log('[Dinosaur-Eats] eating started. Esc=stop, Ctrl+Shift+E=restart');
  }

  function eatCells(mouth) {
    var ate = false;
    for (var si = 0; si < strips.length; si++) {
      var s = strips[si];
      for (var ci = 0; ci < s.cells.length; ci++) {
        var cell = s.cells[ci];
        if (cell.eaten) continue;
        if (rectsOverlap(mouth, cell)) {
          cell.eaten = true;
          ate = true;
        }
      }
    }
    return ate;
  }

  function advanceRow() {
    currentStrip++;
    if (currentStrip >= strips.length) {
      finishEating();
      return true;
    }

    pacman.facingRight = !pacman.facingRight;
    if (pacman.facingRight) {
      pacman.x = -pacman.width;
    } else {
      pacman.x = window.innerWidth;
    }

    var strip = strips[currentStrip];
    pacman.y = strip.y + (strip.height - pacman.height) / 2;
    return false;
  }

  function loop(ts) {
    if (currentState !== STATE_EATING) return;

    pacman.update(ts);

    if (pacman.facingRight) {
      pacman.x += SPEED;
    } else {
      pacman.x -= SPEED;
    }

    var strip = strips[currentStrip];
    pacman.y = strip.y + (strip.height - pacman.height) / 2;

    var mouth = pacman.getMouthRect();
    eatCells(mouth);

    var pastEdge = pacman.facingRight
      ? pacman.x > window.innerWidth
      : pacman.x + pacman.width < 0;

    if (pastEdge) {
      if (advanceRow()) return;
    }

    render();
    animFrameId = requestAnimationFrame(loop);
  }

  function render() {
    var ctx = layer.getCtx();
    if (!ctx) return;

    var dpr = window.devicePixelRatio || 1;
    var bgRgb = sampler.toRgb(bgColor);

    ctx.clearRect(0, 0, window.innerWidth * dpr, window.innerHeight * dpr);

    for (var si = 0; si < strips.length; si++) {
      var s = strips[si];
      for (var ci = 0; ci < s.cells.length; ci++) {
        var c = s.cells[ci];
        if (!c.eaten) continue;
        ctx.fillStyle = bgRgb;
        var rx = Math.round(c.x * dpr);
        var ry = Math.round(c.y * dpr);
        var rw = Math.round(c.w * dpr);
        var rh = Math.round(c.h * dpr);
        ctx.fillRect(rx, ry, rw, rh);
      }
    }

    if (pacman) {
      dinoLayer.position(
        pacman.x, pacman.y,
        pacman.width, pacman.height,
        pacman.facingRight
      );
    }
  }

  function finishEating() {
    currentState = STATE_FINISHED;
    var elapsedSec = Math.round((Date.now() - startTime) / 1000);

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    dinoLayer.remove();

    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var elapsedStr = '用时 ' + elapsedSec + 's';
    var viewportStr = vw + ' x ' + vh;

    renderPixelOverlay(vw, vh, elapsedStr, viewportStr);

    console.log(
      '[Dinosaur-Eats] all cells eaten! ' + viewportStr +
      ', ' + elapsedStr +
      '. Any key=restore, Ctrl+Shift+E=restart'
    );
  }

  function renderPixelOverlay(vw, vh, elapsedStr, viewportStr) {
    var ctx = layer.getCtx();
    if (!ctx) return;

    var dpr = window.devicePixelRatio || 1;

    var boxW = Math.min(480, vw * 0.55) * dpr;
    var boxH = 160 * dpr;
    var bx = (vw * dpr - boxW) / 2;
    var by = (vh * dpr - boxH) / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(bx, by, boxW, boxH);

    ctx.strokeStyle = '#ffd947';
    ctx.lineWidth = 5 * dpr;
    ctx.strokeRect(bx, by, boxW, boxH);

    ctx.lineWidth = 2 * dpr;
    ctx.strokeRect(bx + 4 * dpr, by + 4 * dpr, boxW - 8 * dpr, boxH - 8 * dpr);

    var titleSize = Math.max(18, Math.round(22 * dpr));
    var infoSize = Math.max(12, Math.round(13 * dpr));
    var promptSize = Math.max(13, Math.round(15 * dpr));

    ctx.fillStyle = '#ffd947';
    ctx.font = 'bold ' + titleSize + 'px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('吃光啦!', vw * dpr / 2, by + boxH * 0.20);

    ctx.fillStyle = '#ddd';
    ctx.font = infoSize + 'px monospace';
    ctx.fillText('视口 ' + viewportStr, vw * dpr / 2, by + boxH * 0.48);
    ctx.fillText(elapsedStr, vw * dpr / 2, by + boxH * 0.65);

    ctx.fillStyle = '#ffd947';
    ctx.font = 'bold ' + promptSize + 'px monospace';
    ctx.fillText('按任意键还原', vw * dpr / 2, by + boxH * 0.85);
  }

  function stopEating() {
    if (currentState !== STATE_EATING) return;
    currentState = STATE_IDLE;

    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }

    dinoLayer.remove();
    window.DinoCanvasLayer.destroy();
    console.log('[Dinosaur-Eats] eating stopped, canvas removed.');
  }

  function restoreAndStart() {
    dinoLayer.remove();
    window.DinoCanvasLayer.destroy();
    startEating();
  }

  function onKey(e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      if (currentState === STATE_IDLE || currentState === STATE_FINISHED) {
        restoreAndStart();
      }
      return;
    }

    if (e.key === 'Escape') {
      if (currentState === STATE_EATING) {
        stopEating();
      } else if (currentState === STATE_FINISHED) {
        currentState = STATE_IDLE;
        dinoLayer.remove();
        window.DinoCanvasLayer.destroy();
        console.log('[Dinosaur-Eats] finished viewport restored.');
      }
      return;
    }

    if (currentState === STATE_FINISHED && !e.ctrlKey && !e.metaKey) {
      currentState = STATE_IDLE;
      dinoLayer.remove();
      window.DinoCanvasLayer.destroy();
      console.log('[Dinosaur-Eats] finished viewport restored.');
    }
  }

  document.addEventListener('keydown', onKey);

  startEating();
})();
