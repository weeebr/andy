import { detect } from "tinyld";

export interface DetectedWord {
  text: string;
  language: "de" | "en" | "unknown";
  startIndex: number;
  endIndex: number;
}

export function detectWordLanguages(
  text: string,
  existingWords?: DetectedWord[]
): DetectedWord[] {
  // Create a map of existing words by their text content for more robust lookup
  const existingWordMap = new Map<string, DetectedWord>();
  if (existingWords) {
    for (const word of existingWords) {
      // Use only text as key since indices shift when text is edited
      // For words that appear multiple times, we'll handle them specially
      const key = word.text;
      if (!existingWordMap.has(key)) {
        existingWordMap.set(key, word);
      }
    }
  }

  // Also track manually assigned words by text to preserve across edits
  const manualAssignments = new Map<string, "de" | "en" | "unknown">();
  if (existingWords) {
    for (const word of existingWords) {
      // Only preserve assignments that seem manually set (not auto-detected patterns)
      if (word.language !== "unknown") {
        manualAssignments.set(word.text, word.language);
      }
    }
  }

  const lines = text.split("\n");
  const detectedWords: DetectedWord[] = [];
  let globalIndex = 0;

  for (const line of lines) {
    // Split by word boundaries, but handle decimal numbers specially
    const tokens = line.split(/(\s+|[^a-zA-Z0-9äöüÄÖÜß.\s]+)/);

    for (const token of tokens) {
      if (token.length === 0) continue;

      const startIndex = globalIndex;
      const endIndex = globalIndex + token.length;

      // Check if this word has a manual assignment we should preserve
      let language: "de" | "en" | "unknown" = "unknown";

      // First check for manual assignments (highest priority)
      if (manualAssignments.has(token)) {
        language = manualAssignments.get(token)!;
        console.log(
          `🔒 Preserving manual assignment: "${token}" → ${language}`
        );
      }
      // Then check existing word map as fallback
      else if (existingWordMap.has(token)) {
        const existingWord = existingWordMap.get(token)!;
        language = existingWord.language;
        console.log(`💾 Using existing assignment: "${token}" → ${language}`);
      }

      // Only run detection if we don't have an existing assignment
      if (language === "unknown") {
        if (/^\s+$/.test(token)) {
          // Whitespace token - keep as unknown, don't detect
          language = "unknown";
        } else if (/^[^a-zA-Z0-9äöüÄÖÜß.]+$/.test(token)) {
          // Pure punctuation/symbols (excluding decimal points) - keep as unknown
          language = "unknown";
        } else if (/^[a-zA-Z0-9äöüÄÖÜß.]+$/.test(token)) {
          // Contains alphanumeric or decimal - detect language
          const cleanWord = token.toLowerCase();

          // Check if it's a pure number (including decimals)
          if (/^[0-9.]+$/.test(cleanWord)) {
            // It's a number - keep as unknown for manual assignment
            language = "unknown";
          }
          // Check if it contains letters - then try language detection
          else if (/[a-zA-ZäöüÄÖÜß]/.test(cleanWord)) {
            try {
              // Check for obvious German indicators first
              if (
                /[äöüß]/.test(cleanWord) ||
                [
                  "der",
                  "die",
                  "das",
                  "und",
                  "ist",
                  "sie",
                  "er",
                  "es",
                  "ich",
                  "wir",
                  "ihr",
                  "von",
                  "zu",
                  "mit",
                  "auf",
                  "für",
                  "als",
                  "bei",
                  "nach",
                  "über",
                  "durch",
                  "um",
                  "an",
                  "vor",
                  "gegen",
                  "ohne",
                  "zwischen",
                  "f",
                  "c",
                ].includes(cleanWord)
              ) {
                language = "de";
              }
              // Check for obvious English indicators
              else if (
                [
                  "the",
                  "and",
                  "or",
                  "but",
                  "in",
                  "on",
                  "at",
                  "to",
                  "for",
                  "of",
                  "with",
                  "by",
                  "from",
                  "up",
                  "about",
                  "into",
                  "over",
                  "after",
                  "are",
                  "was",
                  "were",
                  "been",
                  "have",
                  "has",
                  "had",
                  "will",
                  "would",
                  "could",
                  "should",
                  "may",
                  "might",
                  "can",
                  "must",
                  "shall",
                  "do",
                  "does",
                  "did",
                  "get",
                  "got",
                  "go",
                  "went",
                  "come",
                  "came",
                  "see",
                  "saw",
                  "make",
                  "made",
                  "take",
                  "took",
                  "give",
                  "gave",
                  "put",
                  "say",
                  "said",
                  "tell",
                  "told",
                  "know",
                  "knew",
                  "think",
                  "thought",
                  "look",
                  "looked",
                  "use",
                  "used",
                  "find",
                  "found",
                  "want",
                  "wanted",
                  "try",
                  "tried",
                  "ask",
                  "asked",
                  "work",
                  "worked",
                  "seem",
                  "seemed",
                  "feel",
                  "felt",
                  "leave",
                  "left",
                  "call",
                  "called",
                  "f",
                  "c",
                  "i",
                ].includes(cleanWord)
              ) {
                language = "en";
              }
              // Smart pattern-based detection before tinyld
              else if (cleanWord.length >= 2) {
                // GERMAN CAPITALIZATION RULE: Uppercase + lowercase = German noun
                if (
                  /^[A-ZÄÖÜ][a-zäöüß]+$/.test(token) &&
                  cleanWord.length >= 3
                ) {
                  language = "de";
                }
                // English patterns
                else if (
                  cleanWord.endsWith("tion") ||
                  cleanWord.endsWith("ing") ||
                  cleanWord.endsWith("ed") ||
                  cleanWord.endsWith("ly") ||
                  cleanWord.endsWith("er") ||
                  cleanWord.endsWith("est") ||
                  cleanWord.endsWith("ness") ||
                  cleanWord.endsWith("ment") ||
                  cleanWord.endsWith("able") ||
                  cleanWord.endsWith("ible") ||
                  cleanWord.includes("th") ||
                  cleanWord.includes("wh") ||
                  cleanWord.includes("qu") ||
                  cleanWord.includes("ph")
                ) {
                  language = "en";
                }
                // Enhanced German patterns
                else if (
                  cleanWord.endsWith("ung") ||
                  cleanWord.endsWith("keit") ||
                  cleanWord.endsWith("heit") ||
                  cleanWord.endsWith("lich") ||
                  cleanWord.endsWith("sche") ||
                  cleanWord.endsWith("chen") ||
                  cleanWord.endsWith("lein") ||
                  cleanWord.endsWith("bar") ||
                  cleanWord.includes("sch") ||
                  cleanWord.includes("tsch") ||
                  cleanWord.includes("pf") ||
                  cleanWord.includes("tz") ||
                  /^ge[a-z]+t$/.test(cleanWord) // ge...t pattern (past participles)
                ) {
                  language = "de";
                }
                // German prefixes
                else if (
                  cleanWord.startsWith("vor") ||
                  cleanWord.startsWith("nach") ||
                  cleanWord.startsWith("unter") ||
                  cleanWord.startsWith("über") ||
                  cleanWord.startsWith("zwischen") ||
                  cleanWord.startsWith("aus") ||
                  cleanWord.startsWith("ein") ||
                  cleanWord.startsWith("ver")
                ) {
                  language = "de";
                }
                // English prefixes
                else if (
                  cleanWord.startsWith("pre") ||
                  cleanWord.startsWith("post") ||
                  cleanWord.startsWith("anti") ||
                  cleanWord.startsWith("pro") ||
                  cleanWord.startsWith("sub") ||
                  cleanWord.startsWith("super") ||
                  cleanWord.startsWith("inter") ||
                  cleanWord.startsWith("multi")
                ) {
                  language = "en";
                }
                // Double consonants (more common in German, except common English patterns)
                else if (
                  /([bcdfghjklmnpqrstvwxz])\1/.test(cleanWord) &&
                  !cleanWord.includes("ee") &&
                  !cleanWord.includes("oo") &&
                  !cleanWord.includes("ll") &&
                  !cleanWord.includes("ss")
                ) {
                  language = "de";
                }
                // English specific letter combinations
                else if (
                  cleanWord.includes("ck") ||
                  cleanWord.includes("gh") ||
                  cleanWord.includes("ough") ||
                  cleanWord.includes("igh") ||
                  cleanWord.includes("wr")
                ) {
                  language = "en";
                }
                // Fall back to tinyld detection
                else {
                  const detected = detect(cleanWord);
                  if (detected === "de" || detected === "en") {
                    language = detected;
                  }
                }
              } else if (cleanWord.length >= 1) {
                const detected = detect(cleanWord);
                if (detected === "de" || detected === "en") {
                  language = detected;
                }
              }
            } catch {
              // Detection failed, keep as unknown
            }
          }
        } else {
          // Mixed content - split more carefully preserving decimals
          const subTokens = token.split(/([a-zA-Z0-9äöüÄÖÜß.]+)/);
          for (const subToken of subTokens) {
            if (subToken.length === 0) continue;

            const subStartIndex = globalIndex;
            const subEndIndex = globalIndex + subToken.length;

            // Check for existing sub-token assignment
            let subLanguage: "de" | "en" | "unknown" = "unknown";

            // First check for manual assignments (highest priority)
            if (manualAssignments.has(subToken)) {
              subLanguage = manualAssignments.get(subToken)!;
            }
            // Then check existing word map as fallback
            else if (existingWordMap.has(subToken)) {
              const subExistingWord = existingWordMap.get(subToken)!;
              subLanguage = subExistingWord.language;
            }

            // Only detect if we don't have an existing assignment
            if (
              subLanguage === "unknown" &&
              /^[a-zA-Z0-9äöüÄÖÜß.]+$/.test(subToken)
            ) {
              const cleanSubWord = subToken.toLowerCase();

              // Pure number (including decimals)
              if (/^[0-9.]+$/.test(cleanSubWord)) {
                subLanguage = "unknown";
              }
              // Contains letters
              else if (/[a-zA-ZäöüÄÖÜß]/.test(cleanSubWord)) {
                try {
                  if (
                    /[äöüß]/.test(cleanSubWord) ||
                    [
                      "der",
                      "die",
                      "das",
                      "und",
                      "ist",
                      "sie",
                      "er",
                      "es",
                      "ich",
                      "wir",
                      "ihr",
                      "von",
                      "zu",
                      "mit",
                      "auf",
                      "für",
                      "als",
                      "bei",
                      "nach",
                      "über",
                      "durch",
                      "um",
                      "an",
                      "vor",
                      "gegen",
                      "ohne",
                      "zwischen",
                      "f",
                      "c",
                    ].includes(cleanSubWord)
                  ) {
                    subLanguage = "de";
                  } else if (
                    [
                      "the",
                      "and",
                      "or",
                      "but",
                      "in",
                      "on",
                      "at",
                      "to",
                      "for",
                      "of",
                      "with",
                      "by",
                      "from",
                      "up",
                      "about",
                      "into",
                      "over",
                      "after",
                      "are",
                      "was",
                      "were",
                      "been",
                      "have",
                      "has",
                      "had",
                      "will",
                      "would",
                      "could",
                      "should",
                      "may",
                      "might",
                      "can",
                      "must",
                      "shall",
                      "do",
                      "does",
                      "did",
                      "get",
                      "got",
                      "go",
                      "went",
                      "come",
                      "came",
                      "see",
                      "saw",
                      "make",
                      "made",
                      "take",
                      "took",
                      "give",
                      "gave",
                      "put",
                      "say",
                      "said",
                      "tell",
                      "told",
                      "know",
                      "knew",
                      "think",
                      "thought",
                      "look",
                      "looked",
                      "use",
                      "used",
                      "find",
                      "found",
                      "want",
                      "wanted",
                      "try",
                      "tried",
                      "ask",
                      "asked",
                      "work",
                      "worked",
                      "seem",
                      "seemed",
                      "feel",
                      "felt",
                      "leave",
                      "left",
                      "call",
                      "called",
                      "f",
                      "c",
                      "i",
                    ].includes(cleanSubWord)
                  ) {
                    subLanguage = "en";
                  } else if (cleanSubWord.length >= 1) {
                    const detected = detect(cleanSubWord);
                    if (detected === "de" || detected === "en") {
                      subLanguage = detected;
                    }
                  }
                } catch {
                  // Detection failed, keep as unknown
                }
              }
            }

            detectedWords.push({
              text: subToken,
              language: subLanguage,
              startIndex: subStartIndex,
              endIndex: subEndIndex,
            });

            globalIndex += subToken.length;
          }
          continue; // Skip the main token push since we handled sub-tokens
        }
      } // End of if (!existingWord)

      detectedWords.push({
        text: token,
        language,
        startIndex,
        endIndex,
      });

      globalIndex += token.length;
    }

    // Add newline character if not the last line
    if (globalIndex < text.length && text[globalIndex] === "\n") {
      detectedWords.push({
        text: "\n",
        language: "unknown",
        startIndex: globalIndex,
        endIndex: globalIndex + 1,
      });
      globalIndex += 1;
    }
  }

  return detectedWords;
}

export function toggleWordLanguage(word: DetectedWord): DetectedWord {
  const newLanguage =
    word.language === "de" ? "en" : word.language === "en" ? "de" : "en";

  return { ...word, language: newLanguage };
}
