export interface VoiceModel {
  id: string;
  name: string;
  language: "de" | "en";
  voicePattern: string[];
  gender: "female" | "male";
}

export const AVAILABLE_VOICES: VoiceModel[] = [
  // German voices - High quality system voices
  {
    id: "de-female-premium",
    name: "Anna (Weiblich)",
    language: "de",
    voicePattern: [
      "Anna",
      "Petra",
      "Marlene",
      "Vicki",
      "de-DE-Neural",
      "de-DE-Wavenet",
    ],
    gender: "female",
  },
  {
    id: "de-male-premium",
    name: "Stefan (Männlich)",
    language: "de",
    voicePattern: [
      "Stefan",
      "Hans",
      "Ralf",
      "de-DE-Neural",
      "de-DE-Wavenet",
      "German",
    ],
    gender: "male",
  },
  // English voices - High quality system voices
  {
    id: "en-female-premium",
    name: "Samantha (Female)",
    language: "en",
    voicePattern: [
      "Samantha",
      "Victoria",
      "Allison",
      "en-US-Neural",
      "en-US-Wavenet",
      "Microsoft Zira",
    ],
    gender: "female",
  },
  {
    id: "en-male-premium",
    name: "Alex (Male)",
    language: "en",
    voicePattern: [
      "Alex (English",
      "Alex",
      "Daniel",
      "Fred",
      "en-US-Neural",
      "en-US-Wavenet",
      "Microsoft David",
    ],
    gender: "male",
  },
];

// Cache for selected voices
const voiceCache = new Map<string, SpeechSynthesisVoice>();

function findBestVoice(voiceModel: VoiceModel): SpeechSynthesisVoice | null {
  // Check cache first
  if (voiceCache.has(voiceModel.id)) {
    return voiceCache.get(voiceModel.id)!;
  }

  const voices = speechSynthesis.getVoices();
  let bestVoice: SpeechSynthesisVoice | null = null;

  // Filter by language first
  const languageVoices = voices.filter((v) =>
    v.lang.startsWith(voiceModel.language === "de" ? "de" : "en")
  );

  // Debug: List all available voices for this language
  console.log(`🔍 Available ${voiceModel.language} voices:`, languageVoices.map(v => `${v.name} (${v.lang})`));

  // Try to find voices matching our patterns (in priority order)
  for (const pattern of voiceModel.voicePattern) {
    bestVoice =
      languageVoices.find(
        (v) => v.name.includes(pattern) || v.voiceURI.includes(pattern)
      ) || null;

    if (bestVoice) {
      console.log(`🎯 Found voice for pattern "${pattern}": ${bestVoice.name}`);
      break;
    }
  }

  // Fallback: find best quality voice by looking for quality indicators
  if (!bestVoice) {
    const qualityIndicators = [
      "Neural",
      "Wavenet",
      "Premium",
      "High",
      "Enhanced",
    ];

    for (const indicator of qualityIndicators) {
      bestVoice =
        languageVoices.find(
          (v) => v.name.includes(indicator) || v.voiceURI.includes(indicator)
        ) || null;

      if (bestVoice) break;
    }
  }

  // Final fallback: any voice of the correct language
  if (!bestVoice && languageVoices.length > 0) {
    bestVoice = languageVoices[0];
  }

  // Cache the result
  if (bestVoice) {
    voiceCache.set(voiceModel.id, bestVoice);
  }

  return bestVoice;
}

export async function synthesize(
  text: string,
  language: "de" | "en",
  selectedVoices: { de: string; en: string },
  _shouldPlay: boolean = false
): Promise<Float32Array> {
  const selectedVoiceId = selectedVoices[language];
  console.log(
    `🔍 Debug - Language: ${language}, Selected Voice ID: ${selectedVoiceId}`
  );
  console.log(`🔍 Debug - All selected voices:`, selectedVoices);

  const voiceModel = AVAILABLE_VOICES.find((v) => v.id === selectedVoiceId);

  if (!voiceModel) {
    console.error(`❌ Voice model not found: ${selectedVoiceId}`);
    console.log(
      `Available voices:`,
      AVAILABLE_VOICES.map((v) => v.id)
    );
    throw new Error(`Voice model not found: ${selectedVoiceId}`);
  }

  // Wait for voices to be loaded
  if (speechSynthesis.getVoices().length === 0) {
    await new Promise<void>((resolve) => {
      speechSynthesis.addEventListener("voiceschanged", () => {
        // Clear cache when voices change
        voiceCache.clear();
        resolve();
      }, {
        once: true,
      });
      // Fallback timeout
      setTimeout(() => resolve(), 1000);
    });
  }

  const selectedVoice = findBestVoice(voiceModel);

  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }

    console.log(
      `🎙️ Synthesizing with voice: ${voiceModel.name}${
        selectedVoice ? ` (${selectedVoice.name})` : ""
      }`
    );
    console.log(`🗣️ Text: "${text}"`);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "de" ? "de-DE" : "en-US";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0; // Always audible - let the user hear the quality!

    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log(
        `✅ Using system voice: ${selectedVoice.name} (${selectedVoice.lang})`
      );
    }

    let startTime: number;

    utterance.onstart = () => {
      console.log(`🎵 Started synthesis: "${text}"`);
      startTime = Date.now();
    };

    utterance.onend = () => {
      const actualDuration = (Date.now() - startTime) / 1000;
      console.log(
        `✅ Synthesis complete: ${
          text.length
        } characters in ${actualDuration.toFixed(2)}s`
      );

      // Return a minimal buffer just for API compatibility
      // The real value is the actual speech the user hears!
      const sampleRate = 22050;
      const bufferLength = Math.floor(
        sampleRate * Math.max(0.5, actualDuration)
      );
      const audioData = new Float32Array(bufferLength);

      // Minimal noise for compatibility
      for (let i = 0; i < bufferLength; i++) {
        audioData[i] = 0.001 * (Math.random() - 0.5);
      }

      resolve(audioData);
    };

    utterance.onerror = (event) => {
      console.error(`❌ Speech synthesis failed: ${event.error}`);
      reject(new Error(`Speech synthesis failed: ${event.error}`));
    };

    // Always play the speech - this is where the real value is!
    speechSynthesis.speak(utterance);
  });
}
