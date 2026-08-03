(function () {
  'use strict';

  var container = null;

  function createContainer() {
    if (container) return;
    container = document.createElement('div');
    container.id = 'dino-eats-pacman';
    container.style.cssText =
      'position:fixed;top:0;left:0;' +
      'z-index:2147483647;pointer-events:none;' +
      'transform-origin:center;will-change:transform;' +
      'overflow:visible;';
    document.body.appendChild(container);

    try {
      var url = chrome.runtime.getURL('assets/pacman.svg');
      fetch(url)
        .then(function (r) { return r.text(); })
        .then(function (svgText) {
          container.innerHTML = svgText;
          var svg = container.querySelector('svg');
          if (svg) {
            svg.style.display = 'block';
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
          }
        })
        .catch(function () {
          console.warn('[Dinosaur-Eats] failed to load SVG');
        });
    } catch (e) {
      console.warn('[Dinosaur-Eats] SVG load error:', e);
    }
  }

  function positionPacman(x, y, w, h, facingRight) {
    if (!container) return;
    container.style.width = w + 'px';
    container.style.height = h + 'px';
    var tx = 'translate(' + x + 'px,' + y + 'px)';
    if (!facingRight) {
      tx += ' scaleX(-1)';
    }
    container.style.transform = tx;
  }

  function removeContainer() {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    container = null;
  }

  function PacState() {
    this.x = 0;
    this.y = 0;
    this.width = 48;
    this.height = 48;
    this.facingRight = true;
  }

  PacState.prototype.init = function (x, y, size) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = size;
    this.height = size;
  };

  PacState.prototype.update = function () {};

  PacState.prototype.getMouthRect = function () {
    var cx = this.x + this.width / 2;
    var cy = this.y + this.height / 2;
    var mw = this.width * 0.35;
    var mh = this.height * 0.55;

    if (this.facingRight) {
      var mx = cx + this.width * 0.08;
      return { x: mx, y: cy - mh / 2, w: mw, h: mh };
    }
    var mx = cx - this.width * 0.08 - mw;
    return { x: mx, y: cy - mh / 2, w: mw, h: mh };
  };

  window.Dino = PacState;

  window.DinoLayer = {
    create: createContainer,
    position: positionPacman,
    remove: removeContainer
  };
})();
