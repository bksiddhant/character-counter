/* ============================================================
   main.js — App Entry Point
   
   Wires all modules together: event listeners, debounce,
   keyboard shortcuts, toolbar actions, load animations,
   and the history snapshot interval timer.
   
   This is the last script loaded, so all other modules
   (TypeCountStats, TypeCountCharts, TypeCountHistory,
    TypeCountUI) are already available on the global scope.
   ============================================================ */

(function () {
  'use strict';

  /* ---- REFERENCES TO CORE DOM ELEMENTS ---- */
  var editor = document.getElementById('editor');
  var lineNumbers = document.getElementById('line-numbers');
  var lineNumbersInner = document.getElementById('line-numbers-inner');
  var statsGrid = document.getElementById('stats-grid');
  var bottomPanel = document.getElementById('bottom-panel');
  var textareaWrapper = document.querySelector('.textarea-wrapper');

  /* ---- CURRENT STATE ---- */
  var currentText = '';
  var currentStats = null;
  var activeTab = 'frequency';
  var excludeStopWords = true;
  var heatmapMode = 'length';
  var typingTimeout = null;
  var historyInterval = null;

  /* ================================================
     INITIALIZATION
     ================================================ */

  function init() {
    // Build stat cards HTML
    if (statsGrid) {
      statsGrid.innerHTML = TypeCountUI.buildStatCardsHTML();
    }

    // Set up panel resize
    TypeCountUI.initPanelResize();

    // Set up intersection observer for reveal animations
    // Delayed slightly to ensure stat cards exist in the DOM
    setTimeout(function () {
      TypeCountUI.initRevealObserver();
    }, 100);

    // Initialize tabs — default to frequency
    TypeCountUI.switchTab(activeTab);

    // Set up bottom panel (start expanded)
    TypeCountUI.toggleBottomPanel(true);

    // Bind all event listeners
    bindEditorEvents();
    bindToolbarEvents();
    bindTabEvents();
    bindKeyboardShortcuts();
    bindBottomPanelEvents();
    bindHelpModal();
    bindHeatmapControls();
    bindStopWordsToggle();

    // Start history interval (every 5 seconds)
    startHistoryInterval();

    // Run entrance animations
    runEntranceAnimations();

    // Initial stats update (empty text)
    updateAllStats();

    // Typewriter placeholder (delayed for entrance animations)
    setTimeout(function () {
      if (editor && editor.value === '') {
        var placeholder = 'Start typing or click SAMPLE TEXT to begin...';
        editor.setAttribute('placeholder', placeholder);
      }
    }, 800);
  }

  /* ================================================
     DEBOUNCE UTILITY
     ================================================ */

  function debounce(fn, delay) {
    var timer;
    return function () {
      var context = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(context, args);
      }, delay);
    };
  }

  /* ================================================
     EDITOR EVENT BINDINGS
     ================================================ */

  function bindEditorEvents() {
    if (!editor) return;

    // Main input handler — debounced at 100ms
    var debouncedUpdate = debounce(function () {
      currentText = editor.value;
      updateAllStats();
    }, 100);

    editor.addEventListener('input', function () {
      debouncedUpdate();

      // Typing glow effect
      if (textareaWrapper) {
        textareaWrapper.classList.add('typing');
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(function () {
          textareaWrapper.classList.remove('typing');
        }, 1500);
      }

      // Update line numbers immediately (not debounced)
      TypeCountUI.updateLineNumbers(editor.value);
    });

    // Sync line number scroll with textarea
    editor.addEventListener('scroll', function () {
      if (lineNumbers) {
        TypeCountUI.syncLineNumberScroll(editor, lineNumbers);
      }
    });
  }

  /* ================================================
     UPDATE ALL STATS
     ================================================ */

  function updateAllStats() {
    currentText = editor ? editor.value : '';
    currentStats = TypeCountStats.computeAllStats(currentText);

    // Update stat cards with flip animations
    TypeCountUI.updateStatCards(currentStats);

    // Update character badge
    TypeCountUI.updateCharBadge(currentStats.totalChars);

    // Update line numbers
    TypeCountUI.updateLineNumbers(currentText);

    // Update the active tab content (only re-render the visible tab)
    updateActiveTabContent();
  }

  /* ---- UPDATE ACTIVE TAB CONTENT ----
     Only re-renders the tab that is currently visible,
     for performance with large text. */
  function updateActiveTabContent() {
    switch (activeTab) {
      case 'frequency':
        renderFrequencyTab();
        break;
      case 'readability':
        renderReadabilityTab();
        break;
      case 'heatmap':
        renderHeatmapTab();
        break;
      case 'history':
        renderHistoryTab();
        break;
    }
  }

  /* ================================================
     TAB CONTENT RENDERERS
     ================================================ */

  function renderFrequencyTab() {
    var wordContainer = document.getElementById('word-freq-chart');
    var letterContainer = document.getElementById('letter-freq-chart');

    if (wordContainer) {
      var wordFreq = TypeCountStats.wordFrequency(currentText, excludeStopWords);
      TypeCountCharts.renderWordBarChart(wordContainer, wordFreq, 10);
    }

    if (letterContainer) {
      var letterFreq = TypeCountStats.letterFrequency(currentText);
      TypeCountCharts.renderLetterFrequency(letterContainer, letterFreq);
    }
  }

  function renderReadabilityTab() {
    var gaugeContainer = document.getElementById('readability-gauge');
    var pillsContainer = document.getElementById('readability-pills');

    if (!gaugeContainer || !pillsContainer) return;

    var readability = TypeCountStats.computeReadability(currentText);

    TypeCountCharts.renderGauge(
      gaugeContainer,
      readability.fleschEase,
      100,
      'Flesch Reading Ease',
      readability.fleschLabel
    );

    TypeCountCharts.renderReadabilityPills(pillsContainer, readability);
  }

  function renderHeatmapTab() {
    var container = document.getElementById('heatmap-content');
    if (!container) return;

    TypeCountCharts.renderHeatmap(container, currentText, heatmapMode);
  }

  function renderHistoryTab() {
    var sparklineContainer = document.getElementById('history-sparkline');
    var entriesContainer = document.getElementById('history-entries');

    if (!sparklineContainer || !entriesContainer) return;

    var snapshots = TypeCountHistory.getSnapshots();

    // Render sparkline
    TypeCountCharts.renderSparkline(sparklineContainer, snapshots, function (index) {
      restoreFromHistory(index);
    });

    // Render entry list
    entriesContainer.innerHTML = '';

    if (snapshots.length === 0) {
      entriesContainer.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg><span>History snapshots appear every 5 seconds</span></div>';
      return;
    }

    snapshots.slice().reverse().forEach(function (snap, revIndex) {
      var realIndex = snapshots.length - 1 - revIndex;
      var entry = document.createElement('div');
      entry.className = 'history-entry';
      entry.innerHTML =
        '<span class="history-entry__time">' + TypeCountHistory.formatTime(snap.timestamp) + '</span>' +
        '<span class="history-entry__stats">' +
          snap.charCount + ' chars · ' + snap.stats.words + ' words' +
        '</span>' +
        '<span class="history-entry__restore">restore →</span>';

      entry.addEventListener('click', function () {
        restoreFromHistory(realIndex);
      });

      entriesContainer.appendChild(entry);
    });
  }

  /* Restore text from a history snapshot */
  function restoreFromHistory(index) {
    var text = TypeCountHistory.restoreSnapshot(index);
    if (text !== null && editor) {
      editor.value = text;
      currentText = text;
      updateAllStats();
      TypeCountUI.showToast('Text restored from history');
    }
  }

  /* ================================================
     TOOLBAR EVENT BINDINGS
     ================================================ */

  function bindToolbarEvents() {
    // CLEAR button
    var clearBtn = document.getElementById('btn-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearText);
    }

    // COPY button
    var copyBtn = document.getElementById('btn-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyText);
    }

    // PASTE button
    var pasteBtn = document.getElementById('btn-paste');
    if (pasteBtn) {
      pasteBtn.addEventListener('click', pasteText);
    }

    // SAMPLE TEXT button
    var sampleBtn = document.getElementById('btn-sample');
    if (sampleBtn) {
      sampleBtn.addEventListener('click', loadSampleText);
    }

    // EXPORT button
    var exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportStats);
    }
  }

  /* ---- TOOLBAR ACTIONS ---- */

  function clearText() {
    if (!editor) return;

    // Wipe animation
    editor.classList.add('wipe');
    setTimeout(function () {
      editor.value = '';
      editor.classList.remove('wipe');
      currentText = '';
      updateAllStats();
      editor.focus();
    }, 300);
  }

  function copyText() {
    if (!editor) return;

    navigator.clipboard.writeText(editor.value).then(function () {
      var btn = document.getElementById('btn-copy');
      if (btn) {
        btn.classList.add('success');
        var originalHTML = btn.innerHTML;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>COPIED ✓';
        setTimeout(function () {
          btn.classList.remove('success');
          btn.innerHTML = originalHTML;
        }, 2000);
      }
    }).catch(function () {
      TypeCountUI.showToast('Copy failed — try Ctrl+C');
    });
  }

  function pasteText() {
    if (!editor) return;

    navigator.clipboard.readText().then(function (text) {
      editor.value += text;
      currentText = editor.value;
      updateAllStats();
      TypeCountUI.showToast('Text pasted');
    }).catch(function () {
      TypeCountUI.showToast('Paste failed — try Ctrl+V');
    });
  }

  function loadSampleText() {
    if (!editor) return;

    editor.value = '';
    currentText = '';
    updateAllStats();

    // Type it in character by character for visual effect
    TypeCountUI.typewriterPlaceholder(editor, TypeCountStats.SAMPLE_TEXT, function () {
      currentText = editor.value;
      updateAllStats();
    });
  }

  function exportStats() {
    if (!currentStats) return;

    var readability = TypeCountStats.computeReadability(currentText);
    var now = new Date();
    var dateStr = now.toLocaleString();

    var report = '═══════════════════════════════════\n';
    report += '  TYPECOUNT — Statistics Report\n';
    report += '  Generated: ' + dateStr + '\n';
    report += '═══════════════════════════════════\n\n';

    report += '── CORE COUNTS ──\n';
    report += '  Total Characters:     ' + currentStats.totalChars + '\n';
    report += '  Chars (no spaces):    ' + currentStats.charsNoSpaces + '\n';
    report += '  Words:                ' + currentStats.words + '\n';
    report += '  Unique Words:         ' + currentStats.uniqueWords + '\n';
    report += '  Sentences:            ' + currentStats.sentences + '\n';
    report += '  Paragraphs:           ' + currentStats.paragraphs + '\n';
    report += '  Lines:                ' + currentStats.lines + '\n\n';

    report += '── CHARACTER DETAIL ──\n';
    report += '  Spaces:               ' + currentStats.spaces + '\n';
    report += '  Letters (a-z, A-Z):   ' + currentStats.letters + '\n';
    report += '  Digits (0-9):         ' + currentStats.digits + '\n';
    report += '  Special Characters:   ' + currentStats.special + '\n';
    report += '  Punctuation:          ' + currentStats.punctuation + '\n';
    report += '  Uppercase Letters:    ' + currentStats.uppercase + '\n';
    report += '  Lowercase Letters:    ' + currentStats.lowercase + '\n';
    report += '  Emojis:               ' + currentStats.emojis + '\n';
    report += '  Whitespace (total):   ' + currentStats.whitespace + '\n\n';

    report += '── AVERAGES ──\n';
    report += '  Avg Word Length:      ' + currentStats.avgWordLength + '\n';
    report += '  Longest Word:         ' + currentStats.longestWord + '\n';
    report += '  Avg Sentence Length:  ' + currentStats.avgSentenceLength + ' words\n';
    report += '  Avg Paragraph Length: ' + currentStats.avgParagraphLength + ' sentences\n\n';

    report += '── TIME ESTIMATES ──\n';
    report += '  Reading Time:         ' + currentStats.readingTime + '\n';
    report += '  Speaking Time:        ' + currentStats.speakingTime + '\n\n';

    report += '── READABILITY ──\n';
    report += '  Flesch Reading Ease:  ' + readability.fleschEase + ' (' + readability.fleschLabel + ')\n';
    report += '  Flesch-Kincaid Grade: ' + readability.fleschKincaid + '\n';
    report += '  Gunning Fog Index:    ' + readability.gunningFog + '\n';
    report += '  SMOG Index:           ' + readability.smog + '\n';
    report += '  Automated Readability:' + readability.ari + '\n\n';

    report += '═══════════════════════════════════\n';
    report += '  Powered by TYPECOUNT\n';
    report += '═══════════════════════════════════\n';

    // Download as .txt file
    var blob = new Blob([report], { type: 'text/plain' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'typecount-report-' + now.toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);

    TypeCountUI.showToast('Report exported');
  }

  /* ================================================
     TAB EVENT BINDINGS
     ================================================ */

  function bindTabEvents() {
    var tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        activeTab = tab.dataset.tab;
        TypeCountUI.switchTab(activeTab);
        updateActiveTabContent();
      });
    });
  }

  /* ================================================
     BOTTOM PANEL EVENTS (collapse/expand)
     ================================================ */

  function bindBottomPanelEvents() {
    var collapseBtn = document.getElementById('collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function () {
        TypeCountUI.toggleBottomPanel();
      });
    }

    // Mobile toggle
    var mobileToggle = document.getElementById('bottom-toggle-mobile');
    if (mobileToggle) {
      mobileToggle.addEventListener('click', function () {
        TypeCountUI.toggleBottomPanel();
      });
    }
  }

  /* ================================================
     KEYBOARD SHORTCUTS
     ================================================ */

  function bindKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
      var isMod = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + K → Clear
      if (isMod && e.key === 'k') {
        e.preventDefault();
        clearText();
      }

      // Ctrl/Cmd + E → Export
      if (isMod && e.key === 'e') {
        e.preventDefault();
        exportStats();
      }

      // Ctrl/Cmd + Shift + H → Toggle History tab
      if (isMod && e.shiftKey && e.key === 'H') {
        e.preventDefault();
        activeTab = 'history';
        TypeCountUI.switchTab('history');
        TypeCountUI.toggleBottomPanel(true);
        updateActiveTabContent();
      }

      // Escape → Collapse bottom panel
      if (e.key === 'Escape') {
        TypeCountUI.toggleBottomPanel(false);
        // Also close help modal if open
        var modal = document.getElementById('help-modal');
        if (modal && modal.classList.contains('visible')) {
          modal.classList.remove('visible');
        }
      }
    });
  }

  /* ================================================
     HELP MODAL
     ================================================ */

  function bindHelpModal() {
    var helpBtn = document.getElementById('btn-help');
    var helpModal = document.getElementById('help-modal');
    var closeModal = document.getElementById('close-modal');

    if (helpBtn && helpModal) {
      helpBtn.addEventListener('click', function () {
        helpModal.classList.add('visible');
      });
    }

    if (closeModal && helpModal) {
      closeModal.addEventListener('click', function () {
        helpModal.classList.remove('visible');
      });
    }

    if (helpModal) {
      helpModal.addEventListener('click', function (e) {
        if (e.target === helpModal) {
          helpModal.classList.remove('visible');
        }
      });
    }
  }

  /* ================================================
     HEATMAP CONTROLS
     ================================================ */

  function bindHeatmapControls() {
    var lengthBtn = document.getElementById('heatmap-length');
    var freqBtn = document.getElementById('heatmap-frequency');

    if (lengthBtn) {
      lengthBtn.addEventListener('click', function () {
        heatmapMode = 'length';
        lengthBtn.classList.add('active');
        if (freqBtn) freqBtn.classList.remove('active');
        if (activeTab === 'heatmap') renderHeatmapTab();
      });
    }

    if (freqBtn) {
      freqBtn.addEventListener('click', function () {
        heatmapMode = 'frequency';
        freqBtn.classList.add('active');
        if (lengthBtn) lengthBtn.classList.remove('active');
        if (activeTab === 'heatmap') renderHeatmapTab();
      });
    }
  }

  /* ================================================
     STOP WORDS TOGGLE
     ================================================ */

  function bindStopWordsToggle() {
    var toggle = document.getElementById('stop-words-toggle');
    if (toggle) {
      toggle.addEventListener('click', function () {
        excludeStopWords = !excludeStopWords;
        toggle.classList.toggle('on', excludeStopWords);
        if (activeTab === 'frequency') renderFrequencyTab();
      });
    }
  }

  /* ================================================
     HISTORY INTERVAL
     ================================================ */

  function startHistoryInterval() {
    historyInterval = setInterval(function () {
      if (currentText && currentStats) {
        var captured = TypeCountHistory.captureSnapshot(currentText, currentStats);
        if (captured && activeTab === 'history') {
          renderHistoryTab();
        }
      }
    }, 5000);
  }

  /* ================================================
     ENTRANCE ANIMATIONS
     ================================================ */

  function runEntranceAnimations() {
    // Header slides down
    var header = document.querySelector('.header');
    if (header) header.classList.add('anim-slide-down');

    // Left panel fades in
    var panelLeft = document.querySelector('.panel-left');
    if (panelLeft) {
      panelLeft.style.animationDelay = '0.15s';
      panelLeft.classList.add('anim-fade-in');
    }

    // Right panel fades in
    var panelRight = document.querySelector('.panel-right');
    if (panelRight) {
      panelRight.style.animationDelay = '0.25s';
      panelRight.classList.add('anim-fade-in');
    }

    // Stat cards stagger in
    setTimeout(function () {
      TypeCountUI.staggerEntrance('.stat-card');
    }, 300);

    // Bottom panel slides up
    var bp = document.getElementById('bottom-panel');
    if (bp) {
      bp.style.animationDelay = '0.4s';
      bp.classList.add('anim-slide-up');
    }
  }

  /* ================================================
     CLEAR HISTORY BUTTON
     ================================================ */

  // Bind clear history after DOM is ready
  setTimeout(function () {
    var clearHistoryBtn = document.getElementById('btn-clear-history');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', function () {
        TypeCountHistory.clearHistory();
        renderHistoryTab();
        TypeCountUI.showToast('History cleared');
      });
    }
  }, 100);

  /* ================================================
     BOOT
     ================================================ */

  // Wait for DOM to be fully ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
