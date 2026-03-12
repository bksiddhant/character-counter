/* ============================================================
   history.js — Snapshot Logic, Timeline Rendering, Restore
   
   Manages a rolling list of up to 20 text+stats snapshots,
   captured every 5 seconds when text has changed. Provides
   functions to store, list, restore, and clear history.
   
   Exposed on the global scope as `TypeCountHistory`.
   ============================================================ */

var TypeCountHistory = (function () {
  'use strict';

  /* Maximum number of snapshots to keep */
  var MAX_SNAPSHOTS = 20;

  /* The snapshot array.
     Each entry: { text, stats, timestamp, charCount } */
  var snapshots = [];

  /* The last hash of the text, used to detect changes so we
     don't snapshot identical text twice in a row. */
  var lastTextHash = '';

  /* ---- SIMPLE STRING HASH ----
     Fast, non-cryptographic hash for change detection.
     We only need to know "did the text change since last check." */
  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash; // Convert to 32-bit int
    }
    return hash.toString();
  }

  /* ---- CAPTURE SNAPSHOT ----
     Only stores if text has changed since the last snapshot.
     Trims the array to MAX_SNAPSHOTS. */
  function captureSnapshot(text, stats) {
    var hash = simpleHash(text);
    if (hash === lastTextHash) return false; // No change

    lastTextHash = hash;

    var snapshot = {
      text: text,
      stats: {
        totalChars: stats.totalChars,
        words: stats.words,
        sentences: stats.sentences,
        paragraphs: stats.paragraphs
      },
      charCount: stats.totalChars,
      timestamp: Date.now()
    };

    snapshots.push(snapshot);

    // Trim to max size (remove oldest)
    while (snapshots.length > MAX_SNAPSHOTS) {
      snapshots.shift();
    }

    return true;
  }

  /* ---- GET ALL SNAPSHOTS ---- */
  function getSnapshots() {
    return snapshots.slice(); // Return a copy
  }

  /* ---- RESTORE SNAPSHOT ----
     Returns the text from a snapshot at the given index.
     Returns null if index is out of bounds. */
  function restoreSnapshot(index) {
    if (index < 0 || index >= snapshots.length) return null;
    return snapshots[index].text;
  }

  /* ---- CLEAR HISTORY ---- */
  function clearHistory() {
    snapshots = [];
    lastTextHash = '';
  }

  /* ---- FORMAT TIMESTAMP ----
     Converts a timestamp to a human-readable time string. */
  function formatTime(ts) {
    var d = new Date(ts);
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    var s = d.getSeconds().toString().padStart(2, '0');
    return h + ':' + m + ':' + s;
  }

  /* ---- PUBLIC API ---- */
  return {
    captureSnapshot: captureSnapshot,
    getSnapshots: getSnapshots,
    restoreSnapshot: restoreSnapshot,
    clearHistory: clearHistory,
    formatTime: formatTime
  };
})();
