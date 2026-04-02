/* ============================================================
   ui.js — DOM Updates, Number Flip, Tab Switching, Panel
           Resize, IntersectionObserver, Typing Placeholder
   
   All DOM manipulation lives here. This file reads data
   produced by stats.js and calls charts.js to render visuals.
   
   Exposed on the global scope as `TypeCountUI`.
   ============================================================ */

var TypeCountUI = (function () {
  'use strict';

  /* ---- STAT CARD DEFINITIONS ----
     Maps stat keys to their card IDs, labels, icons, and max
     values for the mini sparkline bars. */
  var STAT_DEFS = [
    { key: 'totalChars',        id: 'stat-total-chars',       label: 'Characters',           max: 5000,  icon: 'hash' },
    { key: 'charsNoSpaces',     id: 'stat-chars-no-spaces',   label: 'Chars (No Spaces)',     max: 5000,  icon: 'type' },
    { key: 'words',             id: 'stat-words',             label: 'Words',                 max: 1000,  icon: 'text' },
    { key: 'uniqueWords',       id: 'stat-unique-words',      label: 'Unique Words',          max: 500,   icon: 'star' },
    { key: 'sentences',         id: 'stat-sentences',         label: 'Sentences',             max: 100,   icon: 'dot' },
    { key: 'paragraphs',        id: 'stat-paragraphs',        label: 'Paragraphs',            max: 30,    icon: 'paragraph' },
    { key: 'lines',             id: 'stat-lines',             label: 'Lines',                 max: 200,   icon: 'lines' },
    { key: 'spaces',            id: 'stat-spaces',            label: 'Spaces',                max: 2000,  icon: 'space' },
    { key: 'letters',           id: 'stat-letters',           label: 'Letters',               max: 4000,  icon: 'letter' },
    { key: 'digits',            id: 'stat-digits',            label: 'Digits',                max: 100,   icon: 'number' },
    { key: 'special',           id: 'stat-special',           label: 'Special Chars',         max: 200,   icon: 'special' },
    { key: 'punctuation',       id: 'stat-punctuation',       label: 'Punctuation',           max: 200,   icon: 'punctuation' },
    { key: 'uppercase',         id: 'stat-uppercase',         label: 'Uppercase',             max: 500,   icon: 'upper' },
    { key: 'lowercase',         id: 'stat-lowercase',         label: 'Lowercase',             max: 3500,  icon: 'lower' },
    { key: 'emojis',            id: 'stat-emojis',            label: 'Emojis',                max: 50,    icon: 'emoji' },
    { key: 'avgWordLength',     id: 'stat-avg-word-len',      label: 'Avg Word Length',       max: 15,    icon: 'ruler' },
    { key: 'longestWord',       id: 'stat-longest-word',      label: 'Longest Word',          max: 20,    icon: 'trophy' },
    { key: 'avgSentenceLength', id: 'stat-avg-sent-len',      label: 'Avg Sentence Len',      max: 40,    icon: 'sentence' },
    { key: 'avgParagraphLength',id: 'stat-avg-para-len',      label: 'Avg Paragraph Len',     max: 10,    icon: 'paragraph' },
    { key: 'readingTime',       id: 'stat-reading-time',      label: 'Reading Time',          max: null,  icon: 'clock' },
    { key: 'speakingTime',      id: 'stat-speaking-time',     label: 'Speaking Time',         max: null,  icon: 'mic' },
    { key: 'whitespace',        id: 'stat-whitespace',        label: 'Whitespace',            max: 2000,  icon: 'space' }
  ];

  /* ---- SVG ICON PATHS ----
     Inline SVG paths for stat card icons. Kept minimal. */
  var ICONS = {
    hash:        '<path d="M4 9h16M4 15h16M10 3v18M14 3v18" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    type:        '<path d="M4 7V4h16v3M9 20h6M12 4v16" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    text:        '<path d="M4 6h16M4 10h16M4 14h10M4 18h12" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    star:        '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    dot:         '<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    paragraph:   '<path d="M13 4v16M17 4v16M13 4h3a4 4 0 010 8h-3" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    lines:       '<path d="M4 6h16M4 10h16M4 14h16M4 18h16" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    space:       '<path d="M5 15v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    letter:      '<path d="M3 18l5.5-14h3L17 18M5.5 12h8" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    number:      '<path d="M4 18V8l-2 2M8 8h4v10M8 13h4M16 8c2 0 4 1 4 3s-2 3-4 3 4 1 4 3-2 3-4 3" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    special:     '<path d="M12 3v4m0 10v4M3 12h4m10 0h4M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M18.4 5.6l-2.9 2.9M8.5 15.5l-2.9 2.9" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    punctuation: '<circle cx="12" cy="18" r="1.5" fill="currentColor"/><path d="M12 4v10" stroke="currentColor" stroke-width="2" fill="none"/>',
    upper:       '<path d="M3 18l5.5-14h3L17 18M5.5 12h8M19 8l2 2-2 2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    lower:       '<path d="M3 18l5.5-14h3L17 18M5.5 12h8M19 16l2-2-2-2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    emoji:       '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="9" cy="10" r="1" fill="currentColor"/><circle cx="15" cy="10" r="1" fill="currentColor"/>',
    ruler:       '<path d="M3 5v14h18V5H3zm4 4v6m4-8v8m4-6v6" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    trophy:      '<path d="M6 9V4h12v5a6 6 0 01-12 0zM12 15v3M8 21h8M18 4h2a2 2 0 012 2v1a4 4 0 01-4 4M6 4H4a2 2 0 00-2 2v1a4 4 0 004 4" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    sentence:    '<path d="M4 6h16M4 10h13M4 14h9" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="17" cy="14" r="1" fill="currentColor"/>',
    clock:       '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5" fill="none"/>',
    mic:         '<path d="M12 1a3 3 0 00-3 3v7a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" stroke="currentColor" stroke-width="1.5" fill="none"/>'
  };

  /* Cache of previous stat values for change detection */
  var prevStats = {};

  /* ---- UPDATE STAT CARDS ----
     Iterates through all stat definitions and updates the
     DOM. When a value changes, triggers the flip animation. */
  function updateStatCards(stats) {
    STAT_DEFS.forEach(function (def) {
      var el = document.getElementById(def.id);
      if (!el) return;

      var rawVal = stats[def.key];
      var displayVal;

      // For "longest word", show the word length as the number
      // and the actual word in a tooltip
      if (def.key === 'longestWord') {
        displayVal = rawVal ? rawVal.length.toString() : '0';
        var tooltip = el.querySelector('.stat-card__tooltip');
        if (tooltip) {
          tooltip.textContent = rawVal || '—';
        }
      } else {
        displayVal = rawVal !== undefined ? rawVal.toString() : '0';
      }

      // Get the number element
      var numEl = el.querySelector('.number');
      if (!numEl) return;

      // Check if value has changed
      var prevVal = prevStats[def.key];
      if (prevVal !== displayVal) {
        // Trigger flip animation
        flipNumber(numEl, displayVal);
        prevStats[def.key] = displayVal;
      }

      // Update the mini bar (if this stat has a max)
      if (def.max !== null) {
        var barFill = el.querySelector('.stat-card__bar-fill');
        if (barFill) {
          var numericVal = typeof rawVal === 'number' ? rawVal :
                          (typeof rawVal === 'string' ? rawVal.length : 0);
          var pct = Math.min((numericVal / def.max) * 100, 100);
          barFill.style.width = pct + '%';
        }
      }
    });
  }

  /* ---- NUMBER FLIP ANIMATION ----
     Old number flips up and fades out, new number flips in
     from below. Uses CSS keyframe animation. */
  function flipNumber(el, newValue) {
    // Add flip-out class
    el.classList.add('flip-out');

    // After the flip-out animation, swap the value and flip in
    setTimeout(function () {
      el.textContent = newValue;
      el.classList.remove('flip-out');
      el.classList.add('flip-in');

      // Remove flip-in class after animation completes
      setTimeout(function () {
        el.classList.remove('flip-in');
      }, 400);
    }, 150);
  }

  /* ---- UPDATE CHARACTER BADGE ----
     The floating count in the textarea corner. */
  function updateCharBadge(count) {
    var badge = document.getElementById('char-badge');
    if (badge) {
      badge.textContent = count.toLocaleString() + ' chars';
    }
  }

  /* ---- LINE NUMBERS ----
     Regenerates line number display and syncs scroll with
     the textarea. */
  function updateLineNumbers(text) {
    var lineNumEl = document.getElementById('line-numbers-inner');
    if (!lineNumEl) return;

    var lines = text.split('\n');
    var html = '';
    for (var i = 1; i <= lines.length; i++) {
      html += '<div>' + i + '</div>';
    }
    lineNumEl.innerHTML = html;
  }

  /* Sync line number scroll with textarea scroll */
  function syncLineNumberScroll(textarea, lineNumbersEl) {
    lineNumbersEl.scrollTop = textarea.scrollTop;
  }

  /* ---- TAB SWITCHING ----
     Activates the selected tab, deactivates others, and
     slides the underline indicator to the active tab. */
  function switchTab(tabName) {
    // Update tab buttons
    var tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Move the sliding underline
    var activeTab = document.querySelector('.tab-btn[data-tab="' + tabName + '"]');
    var indicator = document.getElementById('tab-indicator');
    if (activeTab && indicator) {
      indicator.style.left = activeTab.offsetLeft + 'px';
      indicator.style.width = activeTab.offsetWidth + 'px';
    }

    // Show/hide tab content
    var contents = document.querySelectorAll('.tab-content');
    contents.forEach(function (content) {
      content.classList.toggle('active', content.id === 'tab-' + tabName);
    });
  }

  /* ---- PANEL DRAG-TO-RESIZE ----
     Implements mouse-driven resizing between the left and
     right panels using mousemove/mouseup events. */
  function initPanelResize() {
    var handle = document.getElementById('resize-handle');
    var panelLeft = document.querySelector('.panel-left');
    var main = document.querySelector('.main');

    if (!handle || !panelLeft || !main) return;

    var isResizing = false;

    handle.addEventListener('mousedown', function (e) {
      isResizing = true;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!isResizing) return;

      var mainRect = main.getBoundingClientRect();
      var newWidth = e.clientX - mainRect.left;
      var minWidth = 280;
      var maxWidth = mainRect.width - 280;

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        var pct = (newWidth / mainRect.width) * 100;
        panelLeft.style.width = pct + '%';
        // Remove the CSS variable-based transition during drag
        panelLeft.style.transition = 'none';
      }
    });

    document.addEventListener('mouseup', function () {
      if (isResizing) {
        isResizing = false;
        handle.classList.remove('active');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        // Restore smooth transition
        panelLeft.style.transition = '';
      }
    });
  }

  /* ---- INTERSECTION OBSERVER ----
     Animate stat cards when they scroll into view. */
  function initRevealObserver() {
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -20px 0px'
    });

    document.querySelectorAll('.reveal').forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ---- TYPING PLACEHOLDER ----
     Types out a placeholder string character by character. */
  function typewriterPlaceholder(textarea, text, callback) {
    var index = 0;
    var speed = 25; // ms per character

    function typeNext() {
      if (index < text.length) {
        textarea.value += text[index];
        index++;
        // Trigger input event so stats update live
        textarea.dispatchEvent(new Event('input'));
        setTimeout(typeNext, speed);
      } else if (callback) {
        callback();
      }
    }

    typeNext();
  }

  /* ---- STAGGER ENTRANCE ----
     Adds staggered animation-delay to a list of elements. */
  function staggerEntrance(selector) {
    var elements = document.querySelectorAll(selector);
    elements.forEach(function (el, i) {
      el.style.animationDelay = (i * 0.05) + 's';
      el.classList.add('anim-stagger');
    });
  }

  /* ---- TOAST NOTIFICATION ---- */
  function showToast(message, duration) {
    duration = duration || 2000;
    var toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('visible');

    setTimeout(function () {
      toast.classList.remove('visible');
    }, duration);
  }

  /* ---- TOGGLE BOTTOM PANEL ---- */
  function toggleBottomPanel(forceState) {
    var panel = document.getElementById('bottom-panel');
    var collapseBtn = document.getElementById('collapse-btn');
    if (!panel) return;

    var isExpanded;
    if (typeof forceState === 'boolean') {
      isExpanded = forceState;
    } else {
      isExpanded = panel.classList.contains('collapsed');
    }

    panel.classList.toggle('collapsed', !isExpanded);
    panel.classList.toggle('expanded', isExpanded);

    if (collapseBtn) {
      collapseBtn.classList.toggle('rotated', !isExpanded);
    }
  }

  /* ---- BUILD STAT CARDS HTML ----
     Generates the HTML for all stat cards. Called once at init. */
  function buildStatCardsHTML() {
    var sections = [
      {
        title: 'Core Counts',
        keys: ['totalChars', 'charsNoSpaces', 'words', 'uniqueWords', 'sentences', 'paragraphs']
      },
      {
        title: 'Character Details',
        keys: ['lines', 'spaces', 'letters', 'digits', 'special', 'punctuation']
      },
      {
        title: 'Case & Emoji',
        keys: ['uppercase', 'lowercase', 'emojis', 'whitespace']
      },
      {
        title: 'Averages & Lengths',
        keys: ['avgWordLength', 'longestWord', 'avgSentenceLength', 'avgParagraphLength']
      },
      {
        title: 'Time Estimates',
        keys: ['readingTime', 'speakingTime']
      }
    ];

    var html = '';

    sections.forEach(function (section) {
      html += '<div class="stats-section-title">' + section.title + '</div>';

      section.keys.forEach(function (key) {
        var def = STAT_DEFS.find(function (d) { return d.key === key; });
        if (!def) return;

        var iconSvg = ICONS[def.icon] || ICONS.hash;
        var hasTooltip = key === 'longestWord';

        html += '<div class="stat-card reveal" id="' + def.id + '">';
        if (hasTooltip) {
          html += '<div class="stat-card__tooltip">—</div>';
        }
        html += '  <div class="stat-card__header">';
        html += '    <svg class="stat-card__icon" viewBox="0 0 24 24">' + iconSvg + '</svg>';
        html += '    <span class="stat-card__label">' + def.label + '</span>';
        html += '  </div>';
        html += '  <div class="stat-card__value"><span class="number">0</span></div>';
        if (def.max !== null) {
          html += '  <div class="stat-card__bar"><div class="stat-card__bar-fill"></div></div>';
        }
        html += '</div>';
      });
    });

    return html;
  }

  /* ---- PUBLIC API ---- */
  return {
    STAT_DEFS: STAT_DEFS,
    updateStatCards: updateStatCards,
    updateCharBadge: updateCharBadge,
    updateLineNumbers: updateLineNumbers,
    syncLineNumberScroll: syncLineNumberScroll,
    switchTab: switchTab,
    initPanelResize: initPanelResize,
    initRevealObserver: initRevealObserver,
    typewriterPlaceholder: typewriterPlaceholder,
    staggerEntrance: staggerEntrance,
    showToast: showToast,
    toggleBottomPanel: toggleBottomPanel,
    buildStatCardsHTML: buildStatCardsHTML,
    flipNumber: flipNumber
  };
})();
