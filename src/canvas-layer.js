(function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var dpr = window.devicePixelRatio || 1;
  var active = false;
  var pixelSize = 8;

  function createCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'dino-eats-canvas';
    return canvas;
  }

  function sizeCanvas() {
    if (!canvas) return;
    dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
  }

  function onResize() {
    if (!active) return;
    sizeCanvas();
  }

  window.DinoCanvasLayer = {
    init: function () {
      if (canvas) return;
      active = true;
      createCanvas();
      sizeCanvas();
      document.body.appendChild(canvas);
      window.addEventListener('resize', onResize);
      console.log('[Dinosaur-Eats] canvas layer initialized');
    },

    getCanvas: function () {
      return canvas;
    },

    getCtx: function () {
      return ctx;
    },

    getPixelSize: function () {
      return pixelSize;
    },

    isActive: function () {
      return active;
    },

    clear: function () {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },

    destroy: function () {
      active = false;
      window.removeEventListener('resize', onResize);
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      canvas = null;
      ctx = null;
      console.log('[Dinosaur-Eats] canvas layer destroyed');
    }
  };
})();
