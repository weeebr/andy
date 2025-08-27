import type { DetectedWord } from "./detect";
import { synthesize } from "./voices";

export interface SynthesisOptions {
  selectedVoices: { de: string; en: string };
  speed: number;
}

export interface SentenceGroup {
  text: string;
  language: "de" | "en";
  words: DetectedWord[];
}

export function groupWordsBySentence(words: DetectedWord[]): SentenceGroup[] {
  const sentences: SentenceGroup[] = [];
  let currentSentence: DetectedWord[] = [];
  let currentLanguage: "de" | "en" | null = null;

  for (const word of words) {
    // Skip unknown words, whitespace, punctuation, and newlines
    if (
      word.language === "unknown" ||
      /^\s*$/.test(word.text) ||
      word.text === "\n"
    ) {
      continue;
    }

    // Only process words that are actually German or English
    if (word.language !== "de" && word.language !== "en") {
      continue;
    }

    if (currentLanguage === null || currentLanguage === word.language) {
      currentSentence.push(word);
      currentLanguage = word.language;
    } else {
      // Language changed - finalize current sentence
      if (currentSentence.length > 0) {
        // Clean the text by removing extra spaces and joining properly
        const cleanText = currentSentence
          .map((w) => w.text)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanText.length > 0) {
          sentences.push({
            text: cleanText,
            language: currentLanguage,
            words: [...currentSentence],
          });
        }
      }
      currentSentence = [word];
      currentLanguage = word.language;
    }
  }

  // Handle the last sentence
  if (currentSentence.length > 0 && currentLanguage) {
    const cleanText = currentSentence
      .map((w) => w.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (cleanText.length > 0) {
      sentences.push({
        text: cleanText,
        language: currentLanguage,
        words: [...currentSentence],
      });
    }
  }

  return sentences;
}

export async function synthesizeSentences(
  sentences: SentenceGroup[],
  options: SynthesisOptions
): Promise<Float32Array[]> {
  const audioChunks: Float32Array[] = [];

  for (const sentence of sentences) {
    if (sentence.text.trim().length === 0) continue;

    try {
      const audioData = await synthesize(
        sentence.text,
        sentence.language,
        options.selectedVoices
      );

      audioChunks.push(audioData);
    } catch (error) {
      console.error(`Failed to synthesize sentence: "${sentence.text}"`, error);
    }
  }

  return audioChunks;
}
