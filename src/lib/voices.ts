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
    voicePattern: ["Anna"],
    gender: "female",
  },
  {
    id: "de-male-premium",
    name: "Stefan (Männlich)",
    language: "de",
    voicePattern: ["Stefan"],
    gender: "male",
  },
  // English voices - High quality system voices
  {
    id: "en-female-premium",
    name: "Samantha (Female)",
    language: "en",
    voicePattern: ["Samantha"],
    gender: "female",
  },
  {
    id: "en-male-premium",
    name: "Alex (Male)",
    language: "en",
    voicePattern: ["Alex"],
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
  console.log(
    `🔍 Available ${voiceModel.language} voices:`,
    languageVoices.map((v) => `${v.name} (${v.lang})`)
  );

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

export interface SynthesisProgress {
  currentChunk: number;
  totalChunks: number;
  currentText: string;
  isComplete: boolean;
}

export interface ChunkedSynthesisOptions {
  chunkSize?: number;
  onProgress?: (progress: SynthesisProgress) => void;
  onChunkComplete?: (chunkIndex: number, audioData: Float32Array) => void;
  maxMemoryChunks?: number;
  streamingMode?: boolean;
}

export async function synthesize(
  text: string,
  language: "de" | "en",
  selectedVoices: { de: string; en: string }
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
      speechSynthesis.addEventListener(
        "voiceschanged",
        () => {
          // Clear cache when voices change
          voiceCache.clear();
          resolve();
        },
        {
          once: true,
        }
      );
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

export function smartChunkText(text: string, maxChunkSize: number = 200): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/([.!?]+)/);
  
  let currentChunk = '';
  
  for (let i = 0; i < sentences.length; i += 2) {
    const sentence = sentences[i];
    const punctuation = sentences[i + 1] || '';
    const fullSentence = sentence + punctuation;
    
    if (currentChunk.length + fullSentence.length <= maxChunkSize) {
      currentChunk += fullSentence;
    } else {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = fullSentence;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function synthesizeChunked(
  text: string,
  language: "de" | "en",
  selectedVoices: { de: string; en: string },
  options: ChunkedSynthesisOptions = {}
): Promise<Float32Array[]> {
  const { 
    chunkSize = 200, 
    onProgress, 
    onChunkComplete, 
    maxMemoryChunks = 10,
    streamingMode = false 
  } = options;
  
  console.log(`🎯 Starting chunked synthesis for ${text.length} characters`);
  console.log(`💾 Memory settings: maxChunks=${maxMemoryChunks}, streaming=${streamingMode}`);
  
  const chunks = smartChunkText(text, chunkSize);
  const audioChunks: Float32Array[] = [];
  
  console.log(`📦 Split into ${chunks.length} chunks:`, chunks.map(c => `"${c.substring(0, 30)}..."`));
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    onProgress?.({
      currentChunk: i + 1,
      totalChunks: chunks.length,
      currentText: chunk,
      isComplete: false
    });
    
    console.log(`🎵 Synthesizing chunk ${i + 1}/${chunks.length}: "${chunk.substring(0, 50)}..."`);
    
    try {
      const audioData = await synthesize(chunk, language, selectedVoices);
      
      if (streamingMode) {
        // In streaming mode, immediately process and potentially discard old chunks
        onChunkComplete?.(i, audioData);
        
        // Keep only recent chunks in memory
        if (audioChunks.length >= maxMemoryChunks) {
          const removedChunk = audioChunks.shift();
          console.log(`🗑️ Freed memory: removed chunk with ${removedChunk?.length || 0} samples`);
        }
      }
      
      audioChunks.push(audioData);
      
      console.log(`✅ Chunk ${i + 1} complete (${audioData.length} samples)`);
      console.log(`💾 Memory usage: ${audioChunks.length} chunks in memory`);
      
    } catch (error) {
      console.error(`❌ Failed to synthesize chunk ${i + 1}:`, error);
      throw error;
    }
  }
  
  onProgress?.({
    currentChunk: chunks.length,
    totalChunks: chunks.length,
    currentText: '',
    isComplete: true
  });
  
  console.log(`🎉 All ${chunks.length} chunks synthesized successfully!`);
  console.log(`💾 Final memory usage: ${audioChunks.length} chunks`);
  return audioChunks;
}

export function concatenateAudioBuffers(audioChunks: Float32Array[]): Float32Array {
  if (audioChunks.length === 0) {
    return new Float32Array(0);
  }
  
  if (audioChunks.length === 1) {
    return audioChunks[0];
  }
  
  const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Float32Array(totalLength);
  
  let offset = 0;
  for (const chunk of audioChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  console.log(`🔗 Concatenated ${audioChunks.length} chunks into ${totalLength} samples`);
  return result;
}

export function estimateMemoryUsage(audioChunks: Float32Array[]): {
  totalSamples: number;
  estimatedMB: number;
  chunkCount: number;
} {
  const totalSamples = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const estimatedMB = (totalSamples * 4) / (1024 * 1024); // 4 bytes per float32
  
  return {
    totalSamples,
    estimatedMB: Math.round(estimatedMB * 100) / 100,
    chunkCount: audioChunks.length
  };
}

export function shouldUseStreamingMode(textLength: number, chunkSize: number = 200): boolean {
  const estimatedChunks = Math.ceil(textLength / chunkSize);
  const estimatedMemoryMB = (estimatedChunks * chunkSize * 4) / (1024 * 1024);
  
  // Use streaming for texts that would use more than 5MB of memory
  return estimatedMemoryMB > 5;
}
