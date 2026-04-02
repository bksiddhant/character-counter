/* ============================================================
   charts.js — CSS Bar Charts, SVG Gauge Rendering, Heatmap
   
   Renders all visual data representations. Uses DOM manipulation
   for bar charts and heatmap, SVG for gauges, and CSS for all
   animation/transitions.
   
   Exposed on the global scope as `TypeCountCharts`.
   ============================================================ */

var TypeCountCharts = (function () {
  'use strict';

  /* ---- HORIZONTAL BAR CHART ----
     Renders a list of { word, count } as horizontal CSS bars.
     Used for the top-N word frequency display. */
  function renderWordBarChart(container, data, maxItems) {
    maxItems = maxItems || 10;
    container.innerHTML = '';

    if (!data || data.length === 0) {
      container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18M9 3v18"/></svg><span>Type something to see word frequency</span></div>';
      return;
    }

    var items = data.slice(0, maxItems);
    var maxCount = items[0].count;

    var chartEl = document.createElement('div');
    chartEl.className = 'bar-chart';

    items.forEach(function (item, index) {
      var row = document.createElement('div');
      row.className = 'bar-chart__row';

      var label = document.createElement('span');
      label.className = 'bar-chart__label';
      label.textContent = item.word;

      var track = document.createElement('div');
      track.className = 'bar-chart__track';

      var fill = document.createElement('div');
      fill.className = 'bar-chart__fill';
      // Stagger the animation delay for each bar
      fill.style.animationDelay = (index * 0.06) + 's';

      var count = document.createElement('span');
      count.className = 'bar-chart__count';
      count.textContent = item.count;

      track.appendChild(fill);
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(count);
      chartEl.appendChild(row);

      // Animate the bar width after a frame so the transition fires
      requestAnimationFrame(function () {
        var pct = Math.max(4, (item.count / maxCount) * 100);
        fill.style.width = pct + '%';
      });
    });

    container.appendChild(chartEl);
  }

  /* ---- LETTER FREQUENCY MINI BARS ----
     Renders A-Z as vertical bars colored by frequency rank. */
  function renderLetterFrequency(container, freqData) {
    container.innerHTML = '';

    if (!freqData) return;

    var letters = Object.keys(freqData);
    var maxFreq = Math.max.apply(null, letters.map(function (l) { return freqData[l]; }));
    if (maxFreq === 0) maxFreq = 1; // Prevent div-by-zero

    var chartEl = document.createElement('div');
    chartEl.className = 'letter-freq';

    letters.forEach(function (letter, index) {
      var bar = document.createElement('div');
      bar.className = 'letter-freq__bar';

      var fill = document.createElement('div');
      fill.className = 'letter-freq__fill';

      var label = document.createElement('span');
      label.className = 'letter-freq__label';
      label.textContent = letter;

      bar.appendChild(fill);
      bar.appendChild(label);
      chartEl.appendChild(bar);

      // Animate bar height
      requestAnimationFrame(function () {
        var pct = (freqData[letter] / maxFreq) * 100;
        fill.style.height = pct + '%';
        // Color intensity based on rank
        var intensity = freqData[letter] / maxFreq;
        if (intensity > 0.7) {
          fill.style.background = '#f5a623'; // Amber for highest
        } else if (intensity > 0.4) {
          fill.style.background = '#c48820';
        } else {
          fill.style.background = '#5a5650';
        }
      });
    });

    container.appendChild(chartEl);
  }

  /* ---- SVG ARC GAUGE ----
     Draws a semi-circular gauge with animated needle.
     Used for Flesch Reading Ease score. */
  function renderGauge(container, score, maxScore, label, descriptor) {
    maxScore = maxScore || 100;
    var pct = Math.min(score / maxScore, 1);

    // SVG arc parameters
    var cx = 65, cy = 65;
    var radius = 50;
    var startAngle = Math.PI;       // 180° (left)
    var endAngle = 0;               //   0° (right)
    var totalArc = Math.PI;         // 180° sweep

    // Background arc path
    var bgArc = describeArc(cx, cy, radius, startAngle, endAngle);
    // Foreground arc — sweeps from left to the score position
    var scoreAngle = startAngle - (pct * totalArc);
    var fgArc = describeArc(cx, cy, radius, startAngle, scoreAngle);

    // Calculate the arc circumference for dash animation
    var circumference = Math.PI * radius;
    var dashOffset = circumference * (1 - pct);

    var html =
      '<div class="gauge-container">' +
        '<svg class="gauge-svg" viewBox="0 0 130 80">' +
          // Background track
          '<path d="' + bgArc + '" fill="none" stroke="#2a2a2a" stroke-width="8" stroke-linecap="round"/>' +
          // Score fill
          '<path d="' + bgArc + '" fill="none" stroke="' + getGaugeColor(pct) + '" ' +
            'stroke-width="8" stroke-linecap="round" ' +
            'class="gauge-arc-animated" ' +
            'stroke-dasharray="' + circumference + '" ' +
            'stroke-dashoffset="' + dashOffset + '"/>' +
          // Score text
          '<text x="65" y="60" text-anchor="middle" ' +
            'font-family="Playfair Display, Georgia, serif" font-size="22" ' +
            'fill="#f0ebe0">' + score + '</text>' +
        '</svg>' +
        '<div class="gauge-label">' + label + '</div>' +
        (descriptor ? '<div class="gauge-descriptor">' + descriptor + '</div>' : '') +
      '</div>';

    container.innerHTML = html;
  }

  /* Helper: describe a SVG arc path from angle A to angle B */
  function describeArc(cx, cy, r, startAngle, endAngle) {
    var x1 = cx + r * Math.cos(startAngle);
    var y1 = cy - r * Math.sin(startAngle);
    var x2 = cx + r * Math.cos(endAngle);
    var y2 = cy - r * Math.sin(endAngle);

    var sweep = startAngle - endAngle;
    var largeArc = sweep > Math.PI ? 1 : 0;

    return 'M ' + x1 + ' ' + y1 + ' A ' + r + ' ' + r + ' 0 ' + largeArc + ' 0 ' + x2 + ' ' + y2;
  }

  /* Gauge color based on score percentage */
  function getGaugeColor(pct) {
    if (pct >= 0.7) return '#4ecdc4'; // Teal — easy
    if (pct >= 0.4) return '#f5a623'; // Amber — medium
    return '#ef5350';                 // Red — hard
  }

  /* ---- READABILITY PILLS ----
     Renders small pill badges for FK Grade, Fog, SMOG, ARI. */
  function renderReadabilityPills(container, readability) {
    var pills = [
      { name: 'FK Grade', value: readability.fleschKincaid },
      { name: 'Gunning Fog', value: readability.gunningFog },
      { name: 'SMOG', value: readability.smog },
      { name: 'ARI', value: readability.ari }
    ];

    container.innerHTML = '';

    var wrapper = document.createElement('div');
    wrapper.className = 'readability-pills';

    pills.forEach(function (p) {
      var pill = document.createElement('span');
      pill.className = 'pill';
      pill.innerHTML = '<span class="pill__name">' + p.name + '</span><span class="pill__value">' + p.value + '</span>';
      wrapper.appendChild(pill);
    });

    container.appendChild(wrapper);
  }

  /* ---- HEATMAP RENDERER ----
     Renders text with inline word coloring.
     mode: 'length' (color by word length) or 'frequency' (color by rarity). */
  function renderHeatmap(container, text, mode) {
    container.innerHTML = '';

    if (!text || !text.trim()) {
      container.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h8"/></svg><span>Type something to see the heatmap</span></div>';
      return;
    }

    var heatmapDiv = document.createElement('div');
    heatmapDiv.className = 'heatmap-text';

    if (mode === 'frequency') {
      var freqMap = TypeCountStats.getWordFrequencyMap(text);
      var maxFreq = 0;
      Object.keys(freqMap).forEach(function (w) {
        if (freqMap[w] > maxFreq) maxFreq = freqMap[w];
      });

      // Split text by words, preserving whitespace and punctuation
      var parts = text.split(/(\b\w+\b)/g);
      parts.forEach(function (part) {
        if (/^\w+$/.test(part)) {
          var span = document.createElement('span');
          span.className = 'hw';
          var freq = freqMap[part.toLowerCase()] || 1;
          // Rare words = amber (highlighted), common = dim
          var rarity = 1 - (freq / maxFreq);
          span.style.backgroundColor = getFrequencyColor(rarity);
          span.textContent = part;
          heatmapDiv.appendChild(span);
        } else {
          heatmapDiv.appendChild(document.createTextNode(part));
        }
      });
    } else {
      // Length mode: short = cool blue, long = hot red
      var parts2 = text.split(/(\b\w+\b)/g);
      parts2.forEach(function (part) {
        if (/^\w+$/.test(part)) {
          var span = document.createElement('span');
          span.className = 'hw';
          span.style.backgroundColor = getLengthColor(part.length);
          span.textContent = part;
          heatmapDiv.appendChild(span);
        } else {
          heatmapDiv.appendChild(document.createTextNode(part));
        }
      });
    }

    container.appendChild(heatmapDiv);
  }

  /* Heatmap color for word length: 1-3 = cool blue, 4-6 = neutral, 7+ = hot red */
  function getLengthColor(len) {
    if (len <= 2) return 'rgba(74, 144, 217, 0.3)';
    if (len <= 4) return 'rgba(74, 144, 217, 0.15)';
    if (len <= 6) return 'rgba(230, 160, 64, 0.2)';
    if (len <= 8) return 'rgba(230, 120, 50, 0.3)';
    return 'rgba(224, 85, 85, 0.35)';
  }

  /* Heatmap color for word frequency: rare (high rarity) = amber, common = dim */
  function getFrequencyColor(rarity) {
    if (rarity > 0.8) return 'rgba(245, 166, 35, 0.4)';
    if (rarity > 0.6) return 'rgba(245, 166, 35, 0.25)';
    if (rarity > 0.3) return 'rgba(245, 166, 35, 0.1)';
    return 'rgba(90, 86, 80, 0.1)';
  }

  /* ---- HISTORY SPARKLINE ----
     Renders a sparkline SVG of character count over time. */
  function renderSparkline(container, dataPoints, onClickPoint) {
    container.innerHTML = '';

    if (!dataPoints || dataPoints.length === 0) {
      container.innerHTML = '<div class="empty-state" style="height:100%;padding:0"><span style="font-size:11px">No history yet</span></div>';
      return;
    }

    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.style.width = '100%';
    svg.style.height = '100%';

    var maxVal = Math.max.apply(null, dataPoints.map(function (d) { return d.charCount; }));
    if (maxVal === 0) maxVal = 1;

    var points = dataPoints.map(function (d, i) {
      var x = dataPoints.length === 1 ? 50 : (i / (dataPoints.length - 1)) * 100;
      var y = 100 - (d.charCount / maxVal) * 85 - 5;
      return { x: x, y: y, index: i };
    });

    // Draw fill area
    var areaPath = 'M ' + points[0].x + ' 100 ';
    points.forEach(function (p) { areaPath += 'L ' + p.x + ' ' + p.y + ' '; });
    areaPath += 'L ' + points[points.length - 1].x + ' 100 Z';

    var area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('d', areaPath);
    area.setAttribute('fill', 'rgba(245, 166, 35, 0.1)');
    svg.appendChild(area);

    // Draw line
    var linePath = 'M ';
    points.forEach(function (p, i) {
      linePath += (i > 0 ? 'L ' : '') + p.x + ' ' + p.y + ' ';
    });

    var line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', linePath);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#f5a623');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(line);

    // Draw dots (clickable)
    points.forEach(function (p) {
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', p.x);
      circle.setAttribute('cy', p.y);
      circle.setAttribute('r', '3');
      circle.setAttribute('fill', '#f5a623');
      circle.setAttribute('stroke', '#0a0a0a');
      circle.setAttribute('stroke-width', '1.5');
      circle.setAttribute('vector-effect', 'non-scaling-stroke');
      circle.style.cursor = 'pointer';

      circle.addEventListener('click', function () {
        if (onClickPoint) onClickPoint(p.index);
      });

      svg.appendChild(circle);
    });

    container.appendChild(svg);
  }

  /* ---- PUBLIC API ---- */
  return {
    renderWordBarChart: renderWordBarChart,
    renderLetterFrequency: renderLetterFrequency,
    renderGauge: renderGauge,
    renderReadabilityPills: renderReadabilityPills,
    renderHeatmap: renderHeatmap,
    renderSparkline: renderSparkline
  };
})();
