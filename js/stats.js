/* ============================================================
   stats.js — Pure Counting & Readability Functions
   
   ZERO DOM dependencies. Every function takes a string and
   returns data. This makes everything easily testable in
   isolation (paste into a Node REPL if you want).
   
   Exposed on the global scope as `TypeCountStats`.
   ============================================================ */

var TypeCountStats = (function () {
  'use strict';

  /* ---- STOP WORDS ----
     Common English words to filter out of frequency analysis.
     Kept short but effective. */
  var STOP_WORDS = new Set([
    'the','be','to','of','and','a','in','that','have','i',
    'it','for','not','on','with','he','as','you','do','at',
    'this','but','his','by','from','they','we','her','she','or',
    'an','will','my','one','all','would','there','their','what',
    'so','up','out','if','about','who','get','which','go','me',
    'when','make','can','like','time','no','just','him','know',
    'take','people','into','year','your','good','some','could',
    'them','see','other','than','then','now','look','only','come',
    'its','over','think','also','back','after','use','two','how',
    'our','work','first','well','way','even','new','want','because',
    'any','these','give','day','most','us','is','was','are','were',
    'been','has','had','did','does','am','being','having','done'
  ]);

  /* ---- SYLLABLE COUNTER ----
     Approximate English syllable count for readability formulas.
     Uses a heuristic approach: count vowel groups, then adjust
     for silent-e and common diphthongs. */
  function countSyllables(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 2) return word.length > 0 ? 1 : 0;

    // Remove trailing silent-e
    word = word.replace(/e$/, '');

    // Count vowel groups (each group = ~1 syllable)
    var matches = word.match(/[aeiouy]+/g);
    var count = matches ? matches.length : 1;

    // Guarantee at least 1 syllable for any real word
    return Math.max(1, count);
  }

  /* ---- WORD TOKENIZER ----
     Splits text into an array of words, handling punctuation,
     hyphens, and Unicode reasonably well. */
  function getWords(text) {
    if (!text || !text.trim()) return [];
    // Match sequences of word characters, including apostrophes
    // within words (e.g., "don't") and Unicode letters
    var matches = text.match(/[\w\u00C0-\u024F\u1E00-\u1EFF']+/g);
    return matches || [];
  }

  /* ---- SENTENCE SPLITTER ----
     Splits on sentence-ending punctuation (.!?) followed by
     whitespace or end-of-string. Handles abbreviations poorly
     (by design — perfect sentence detection requires NLP). */
  function getSentences(text) {
    if (!text || !text.trim()) return [];
    var sentences = text.split(/[.!?]+\s*/g).filter(function (s) {
      return s.trim().length > 0;
    });
    return sentences;
  }

  /* ---- PARAGRAPH SPLITTER ---- */
  function getParagraphs(text) {
    if (!text || !text.trim()) return [];
    return text.split(/\n\s*\n/).filter(function (p) {
      return p.trim().length > 0;
    });
  }

  /* ---- EMOJI DETECTOR ----
     Uses Unicode property escapes for modern emoji detection.
     Falls back to a range-based regex for older browsers. */
  function countEmojis(text) {
    try {
      var matches = text.match(/\p{Emoji_Presentation}/gu);
      return matches ? matches.length : 0;
    } catch (e) {
      // Fallback: basic emoji ranges
      var matches2 = text.match(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu);
      return matches2 ? matches2.length : 0;
    }
  }

  /* ---- CORE STATS COMPUTATION ----
     The big one. Returns an object with ALL stats. */
  function computeAllStats(text) {
    text = text || '';

    var words = getWords(text);
    var sentences = getSentences(text);
    var paragraphs = getParagraphs(text);
    var lines = text ? text.split('\n') : [];

    // Basic counts
    var totalChars = text.length;
    var charsNoSpaces = text.replace(/\s/g, '').length;
    var wordCount = words.length;
    var sentenceCount = sentences.length;
    var paragraphCount = paragraphs.length;
    var lineCount = lines.length;

    // Character type counts
    var spaces = (text.match(/ /g) || []).length;
    var letters = (text.match(/[a-zA-Z]/g) || []).length;
    var digits = (text.match(/[0-9]/g) || []).length;
    var uppercase = (text.match(/[A-Z]/g) || []).length;
    var lowercase = (text.match(/[a-z]/g) || []).length;

    // Punctuation: common punctuation characters
    var punctuation = (text.match(/[.,;:!?'"()\[\]{}\-–—\/\\]/g) || []).length;

    // Special characters: everything that is NOT a letter, digit, or whitespace
    var special = (text.match(/[^a-zA-Z0-9\s]/g) || []).length;

    // Emojis
    var emojis = countEmojis(text);

    // Whitespace (spaces + tabs + newlines)
    var whitespace = (text.match(/\s/g) || []).length;

    // Unique words
    var wordLower = words.map(function (w) { return w.toLowerCase(); });
    var uniqueWords = new Set(wordLower).size;

    // Average word length
    var avgWordLength = wordCount > 0
      ? (words.reduce(function (sum, w) { return sum + w.length; }, 0) / wordCount)
      : 0;

    // Longest word
    var longestWord = words.reduce(function (longest, w) {
      return w.length > longest.length ? w : longest;
    }, '');

    // Average sentence length (words per sentence)
    var avgSentenceLength = sentenceCount > 0
      ? wordCount / sentenceCount
      : 0;

    // Average paragraph length (sentences per paragraph)
    var avgParagraphLength = paragraphCount > 0
      ? sentenceCount / paragraphCount
      : 0;

    // Reading time at 238 wpm
    var readingTimeMin = Math.floor(wordCount / 238);
    var readingTimeSec = Math.round((wordCount % 238) / 238 * 60);
    var readingTime = readingTimeMin > 0
      ? readingTimeMin + ' min ' + readingTimeSec + ' sec'
      : readingTimeSec + ' sec';

    // Speaking time at 130 wpm
    var speakingTimeMin = Math.floor(wordCount / 130);
    var speakingTimeSec = Math.round((wordCount % 130) / 130 * 60);
    var speakingTime = speakingTimeMin > 0
      ? speakingTimeMin + ' min ' + speakingTimeSec + ' sec'
      : speakingTimeSec + ' sec';

    return {
      totalChars: totalChars,
      charsNoSpaces: charsNoSpaces,
      words: wordCount,
      uniqueWords: uniqueWords,
      sentences: sentenceCount,
      paragraphs: paragraphCount,
      lines: lineCount,
      spaces: spaces,
      letters: letters,
      digits: digits,
      special: special,
      punctuation: punctuation,
      uppercase: uppercase,
      lowercase: lowercase,
      emojis: emojis,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      longestWord: longestWord,
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      avgParagraphLength: Math.round(avgParagraphLength * 10) / 10,
      readingTime: readingTime,
      speakingTime: speakingTime,
      whitespace: whitespace
    };
  }

  /* ---- READABILITY FORMULAS ----
     All take the same 3 inputs for consistency:
     totalWords, totalSentences, totalSyllables.
     Some also need complexWords (3+ syllables). */

  /* Flesch Reading Ease: higher = easier to read.
     206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words) */
  function fleschReadingEase(totalWords, totalSentences, totalSyllables) {
    if (totalWords === 0 || totalSentences === 0) return 0;
    var score = 206.835
      - 1.015 * (totalWords / totalSentences)
      - 84.6  * (totalSyllables / totalWords);
    return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
  }

  /* Flesch Reading Ease descriptor */
  function fleschLabel(score) {
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Confusing';
  }

  /* Flesch-Kincaid Grade Level:
     0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59 */
  function fleschKincaidGrade(totalWords, totalSentences, totalSyllables) {
    if (totalWords === 0 || totalSentences === 0) return 0;
    var score = 0.39 * (totalWords / totalSentences)
      + 11.8 * (totalSyllables / totalWords)
      - 15.59;
    return Math.max(0, Math.round(score * 10) / 10);
  }

  /* Gunning Fog Index:
     0.4 * ((words/sentences) + 100 * (complexWords/words))
     Complex words = 3+ syllables */
  function gunningFog(totalWords, totalSentences, complexWords) {
    if (totalWords === 0 || totalSentences === 0) return 0;
    var score = 0.4 * (
      (totalWords / totalSentences) + 100 * (complexWords / totalWords)
    );
    return Math.max(0, Math.round(score * 10) / 10);
  }

  /* SMOG Index:
     1.0430 * sqrt(complexWords * (30 / sentences)) + 3.1291
     Technically requires 30+ sentences; we compute it anyway. */
  function smogIndex(totalSentences, complexWords) {
    if (totalSentences === 0) return 0;
    var score = 1.0430 * Math.sqrt(complexWords * (30 / totalSentences)) + 3.1291;
    return Math.max(0, Math.round(score * 10) / 10);
  }

  /* Automated Readability Index (ARI):
     4.71 * (chars/words) + 0.5 * (words/sentences) - 21.43 */
  function automatedReadabilityIndex(totalChars, totalWords, totalSentences) {
    if (totalWords === 0 || totalSentences === 0) return 0;
    var score = 4.71 * (totalChars / totalWords)
      + 0.5 * (totalWords / totalSentences)
      - 21.43;
    return Math.max(0, Math.round(score * 10) / 10);
  }

  /* Compute all readability scores at once */
  function computeReadability(text) {
    var words = getWords(text);
    var sentences = getSentences(text);
    var totalWords = words.length;
    var totalSentences = sentences.length;

    if (totalWords === 0) {
      return {
        fleschEase: 0,
        fleschLabel: '—',
        fleschKincaid: 0,
        gunningFog: 0,
        smog: 0,
        ari: 0
      };
    }

    // Count total syllables and complex words (3+ syllables)
    var totalSyllables = 0;
    var complexWords = 0;
    var charsInWords = 0;

    words.forEach(function (w) {
      var syllables = countSyllables(w);
      totalSyllables += syllables;
      if (syllables >= 3) complexWords++;
      charsInWords += w.length;
    });

    var fre = fleschReadingEase(totalWords, totalSentences, totalSyllables);

    return {
      fleschEase: fre,
      fleschLabel: fleschLabel(fre),
      fleschKincaid: fleschKincaidGrade(totalWords, totalSentences, totalSyllables),
      gunningFog: gunningFog(totalWords, totalSentences, complexWords),
      smog: smogIndex(totalSentences, complexWords),
      ari: automatedReadabilityIndex(charsInWords, totalWords, totalSentences)
    };
  }

  /* ---- WORD FREQUENCY ----
     Returns an array of { word, count } sorted by count desc.
     Optionally filters out stop words. */
  function wordFrequency(text, excludeStopWords) {
    var words = getWords(text).map(function (w) { return w.toLowerCase(); });
    var freq = {};

    words.forEach(function (w) {
      if (excludeStopWords && STOP_WORDS.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });

    return Object.keys(freq)
      .map(function (w) { return { word: w, count: freq[w] }; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  /* ---- LETTER FREQUENCY ----
     Returns an object with counts for A-Z (case-insensitive). */
  function letterFrequency(text) {
    var freq = {};
    for (var i = 65; i <= 90; i++) {
      freq[String.fromCharCode(i)] = 0;
    }
    text.toUpperCase().split('').forEach(function (ch) {
      if (ch >= 'A' && ch <= 'Z') {
        freq[ch]++;
      }
    });
    return freq;
  }

  /* ---- WORD LENGTHS (for heatmap) ----
     Returns an array of { word, length, original } for each
     token in the text including whitespace preservation. */
  function getWordLengths(text) {
    // Split preserving whitespace tokens
    var tokens = text.split(/(\s+)/);
    return tokens.map(function (token) {
      var stripped = token.replace(/[^a-zA-Z0-9]/g, '');
      return {
        token: token,
        length: stripped.length,
        isWord: stripped.length > 0
      };
    });
  }

  /* ---- WORD FREQUENCY MAP (for heatmap) ----
     Returns an object mapping lowercase words to their count. */
  function getWordFrequencyMap(text) {
    var words = getWords(text);
    var freq = {};
    words.forEach(function (w) {
      var lower = w.toLowerCase();
      freq[lower] = (freq[lower] || 0) + 1;
    });
    return freq;
  }

  /* ---- SAMPLE TEXT ----
     A carefully crafted ~300 word passage that showcases ALL
     stats well: mixed paragraph lengths, numbers, punctuation,
     long/short words, emojis, etc. */
  var SAMPLE_TEXT = 'The Art of Typography: A Timeless Craft 🎨\n\n' +
    'Typography is far more than just "choosing fonts." It is the invisible architecture ' +
    'of written language — a discipline that has shaped civilization for over 500 years, ' +
    'ever since Johannes Gutenberg\'s revolutionary movable-type printing press transformed ' +
    'Europe in 1440. Today, we interact with typography every single moment: on screens, ' +
    'in books, across billboards, and throughout the 4.5 billion web pages that exist online.\n\n' +
    'Consider this: the average person reads approximately 100,000 words per day! That\'s ' +
    'roughly 250 pages of carefully typeset text flowing through our consciousness. Each ' +
    'word carries weight; each letterform has been meticulously designed by craftspeople ' +
    'who understand that readability is not merely functional — it is fundamentally ' +
    'emotional. A well-set paragraph invites you in. A poorly-set one pushes you away.\n\n' +
    'The 26 letters of the English alphabet (plus 10 digits: 0123456789) can be arranged ' +
    'into an extraordinary, almost incomprehensible number of combinations. Shakespeare ' +
    'used approximately 31,534 unique words across his complete works. The Oxford English ' +
    'Dictionary contains 171,476 words currently in use... and that doesn\'t even count ' +
    'technical jargon, slang, or neologisms!\n\n' +
    'Great designers like Jan Tschichold, Emil Ruder, and Massimo Vignelli understood ' +
    'something profound: constraints breed creativity. When you limit yourself to 2–3 ' +
    'typefaces, a disciplined grid, and a restrained color palette, the result is not ' +
    'limitation but liberation. 🚀\n\n' +
    'So the next time you glance at a beautifully set page — whether it\'s a novel, a ' +
    'website, or even a humble grocery list — pause for a moment. Appreciate the ' +
    'centuries of craft, innovation, and obsessive attention to detail that brought ' +
    'those characters to your eyes. Typography matters. Every. Single. Glyph. ✨';

  /* ---- PUBLIC API ---- */
  return {
    computeAllStats: computeAllStats,
    computeReadability: computeReadability,
    wordFrequency: wordFrequency,
    letterFrequency: letterFrequency,
    getWordLengths: getWordLengths,
    getWordFrequencyMap: getWordFrequencyMap,
    getWords: getWords,
    getSentences: getSentences,
    countSyllables: countSyllables,
    SAMPLE_TEXT: SAMPLE_TEXT,
    STOP_WORDS: STOP_WORDS
  };
})();
