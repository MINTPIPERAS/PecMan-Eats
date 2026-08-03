(function () {
  'use strict';

  var BG_SAMPLE_COLS = 6;
  var BG_SAMPLE_ROWS = 4;

  function parseColor(str) {
    if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') {
      return null;
    }

    var match;

    match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (match) {
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1
      };
    }

    match = str.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (match) {
      return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16),
        a: 1
      };
    }

    match = str.match(/#([0-9a-f])([0-9a-f])([0-9a-f])/i);
    if (match) {
      return {
        r: parseInt(match[1] + match[1], 16),
        g: parseInt(match[2] + match[2], 16),
        b: parseInt(match[3] + match[3], 16),
        a: 1
      };
    }

    return null;
  }

  function samplePoint(doc, x, y) {
    var el = doc.elementFromPoint(x, y);
    if (!el) return null;

    var current = el;
    while (current && current !== doc.documentElement) {
      try {
        var style = doc.defaultView.getComputedStyle(current);
        var bg = style.backgroundColor;
        var color = parseColor(bg);

        if (color && color.a > 0.05) {
          if (color.a < 1) {
            color.r = Math.round(color.r * color.a + 255 * (1 - color.a));
            color.g = Math.round(color.g * color.a + 255 * (1 - color.a));
            color.b = Math.round(color.b * color.a + 255 * (1 - color.a));
            color.a = 1;
          }
          return color;
        }
      } catch (_) {
      }
      current = current.parentElement;
    }

    return null;
  }

  function getDocBg(doc) {
    if (!doc || !doc.body) return null;

    try {
      var style = doc.defaultView.getComputedStyle(doc.body);
      var color = parseColor(style.backgroundColor);
      if (color && color.a > 0.05) return color;
    } catch (_) {
    }

    try {
      var htmlStyle = doc.defaultView.getComputedStyle(doc.documentElement);
      var htmlColor = parseColor(htmlStyle.backgroundColor);
      if (htmlColor && htmlColor.a > 0.05) return htmlColor;
    } catch (_) {
    }

    return null;
  }

  window.BgSampler = {
    samplePageColor: function (doc, cols, rows) {
      doc = doc || document;
      cols = cols || BG_SAMPLE_COLS;
      rows = rows || BG_SAMPLE_ROWS;

      var win = doc.defaultView;
      var vw = win.innerWidth;
      var vh = win.innerHeight;

      if (vw <= 0 || vh <= 0) return getDocBg(doc) || { r: 255, g: 255, b: 255, a: 1 };

      var samples = [];
      var stepX = vw / (cols + 1);
      var stepY = vh / (rows + 1);

      for (var ri = 1; ri <= rows; ri++) {
        for (var ci = 1; ci <= cols; ci++) {
          var sx = Math.round(stepX * ci);
          var sy = Math.round(stepY * ri);
          var color = samplePoint(doc, sx, sy);
          if (color) {
            samples.push(color);
          }
        }
      }

      if (samples.length === 0) {
        return getDocBg(doc) || { r: 255, g: 255, b: 255, a: 1 };
      }

      var totalR = 0, totalG = 0, totalB = 0;
      for (var i = 0; i < samples.length; i++) {
        totalR += samples[i].r;
        totalG += samples[i].g;
        totalB += samples[i].b;
      }

      return {
        r: Math.round(totalR / samples.length),
        g: Math.round(totalG / samples.length),
        b: Math.round(totalB / samples.length),
        a: 1
      };
    },

    toHex: function (color) {
      var r = color.r.toString(16);
      var g = color.g.toString(16);
      var b = color.b.toString(16);
      return '#' +
        (r.length === 1 ? '0' + r : r) +
        (g.length === 1 ? '0' + g : g) +
        (b.length === 1 ? '0' + b : b);
    },

    toRgb: function (color) {
      return 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
    }
  };
})();
