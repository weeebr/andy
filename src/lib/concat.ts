// Simplified audio handling without complex dependencies

export function concatenateAudio(
  audioChunks: Float32Array[],
  _sampleRate: number = 22050
): Float32Array {
  if (audioChunks.length === 0) {
    return new Float32Array(0);
  }

  // Calculate total length
  const totalLength = audioChunks.reduce(
    (sum, chunk) => sum + chunk.length,
    0
  );

  // Concatenate all chunks
  const result = new Float32Array(totalLength);
  let offset = 0;

  for (const chunk of audioChunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function createWavFile(audioData: Float32Array, sampleRate: number): Uint8Array {
  const length = audioData.length;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);

  // Convert float audio data to 16-bit PCM
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }

  return new Uint8Array(arrayBuffer);
}

export function encodeToMp3(
  audioData: Float32Array,
  sampleRate: number = 22050
): Uint8Array {
  // Create WAV file instead of MP3 for simplicity
  return createWavFile(audioData, sampleRate);
}

export function downloadMp3(audioData: Uint8Array, filename: string = "polyspeak-audio.wav") {
  const blob = new Blob([audioData], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}