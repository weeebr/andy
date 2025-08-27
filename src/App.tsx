import { AVAILABLE_VOICES, synthesize } from "./lib/voices";
import { detectWordLanguages, toggleWordLanguage } from "./lib/detect";
import { useEffect, useState } from "react";

import type { DetectedWord } from "./lib/detect";
import { groupWordsBySentence } from "./lib/synth";

function App() {
  const [inputText, setInputText] = useState("");
  const [detectedWords, setDetectedWords] = useState<DetectedWord[]>([]);
  const [selectedVoices, setSelectedVoices] = useState({
    de: "de-female-premium",
    en: "en-female-premium",
  });
  const [speed, setSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playMode, setPlayMode] = useState<"download" | "play">("play");
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasRestoredWords, setHasRestoredWords] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("polyspeak-session");
    console.log("🔍 Loading from localStorage:", saved);

    if (saved) {
      try {
        const data = JSON.parse(saved);
        const loadedText = data.inputText || "";

        console.log("📝 Loaded text:", loadedText);
        console.log("🎙️ Loaded voices:", data.selectedVoices);
        console.log(
          "📋 Loaded detectedWords:",
          data.detectedWords?.length || 0,
          "words"
        );
        console.log("⚡ Loaded speed:", data.speed);
        console.log("🎵 Loaded playMode:", data.playMode);

        setInputText(loadedText);

        // Restore detected words if they exist and match the loaded text
        if (
          data.detectedWords &&
          Array.isArray(data.detectedWords) &&
          loadedText
        ) {
          // Verify the detected words still match the current text
          const savedText = data.detectedWords
            .map((w: DetectedWord) => w.text)
            .join("");
          if (savedText === loadedText) {
            console.log("✅ Restoring saved word language assignments");
            setDetectedWords(data.detectedWords);
            setHasRestoredWords(true);
          } else {
            console.log("🔄 Text changed, re-detecting words");
            // Text has changed, trigger new detection via useEffect
          }
        }

        // Validate saved voices against new voice system
        const validVoiceIds = AVAILABLE_VOICES.map((v) => v.id);
        const savedVoices = data.selectedVoices;

        setSelectedVoices({
          de:
            savedVoices?.de && validVoiceIds.includes(savedVoices.de)
              ? savedVoices.de
              : "de-female-premium",
          en:
            savedVoices?.en && validVoiceIds.includes(savedVoices.en)
              ? savedVoices.en
              : "en-female-premium",
        });

        setSpeed(data.speed || 1.0);
        setPlayMode(data.playMode || "play");
      } catch (error) {
        console.error("Failed to load saved session:", error);
      }
    } else {
      console.log("ℹ️ No saved session found");
    }

    setIsLoaded(true); // Mark as loaded to enable saving
  }, []);

  // 🔄 Auto-trigger word detection whenever inputText changes (but not during initial load)
  useEffect(() => {
    // Don't auto-detect during initial load if we're not ready yet
    if (!isLoaded) {
      console.log(
        "⏳ Skipping auto-detection: still loading from localStorage"
      );
      return;
    }

    // Don't auto-detect if we just restored words from saved state
    if (hasRestoredWords) {
      console.log(
        "💾 Skipping auto-detection: using restored word assignments"
      );
      return;
    }

    // Only auto-detect if we have text and no matching detected words
    if (inputText.trim().length > 0) {
      // Check if we already have detected words that match this text
      const currentText = detectedWords.map((w) => w.text).join("");

      if (currentText !== inputText) {
        console.log(
          "🔄 Auto-detecting words for text:",
          inputText.substring(0, 50) + "..."
        );
        const words = detectWordLanguages(inputText);
        console.log("✅ Auto-detection returned:", words.length, "words");
        setDetectedWords(words);
      } else {
        console.log("💾 Using existing detected words (no change needed)");
      }
    } else {
      setDetectedWords([]);
    }
  }, [inputText, detectedWords, isLoaded, hasRestoredWords]);

  useEffect(() => {
    // Only save after initial load is complete
    if (!isLoaded) return;

    const sessionData = {
      inputText,
      detectedWords,
      selectedVoices,
      speed,
      playMode,
    };

    console.log("💾 Saving to localStorage:", sessionData);
    localStorage.setItem("polyspeak-session", JSON.stringify(sessionData));
  }, [inputText, detectedWords, selectedVoices, speed, playMode, isLoaded]);

  const handleTextChange = (text: string) => {
    setInputText(text);
    // Reset the restored words flag when user manually changes text
    if (hasRestoredWords) {
      console.log("🔄 User changed text, enabling auto-detection again");
      setHasRestoredWords(false);
    }
    // Detection is now handled automatically by useEffect
  };

  const handleWordToggle = (index: number) => {
    const newWords = [...detectedWords];
    newWords[index] = toggleWordLanguage(newWords[index]);
    setDetectedWords(newWords);
  };

  const handleGenerate = async () => {
    if (detectedWords.length === 0) return;

    setIsGenerating(true);
    try {
      const sentences = groupWordsBySentence(detectedWords);

      if (sentences.length === 0) {
        alert("Keine Wörter zum Synthetisieren!");
        return;
      }

      console.log("Grouped sentences:", sentences);
      console.log("🎵 Play mode:", playMode);

      // Use high-quality Web Speech API for natural voice synthesis
      setIsGenerating(false);

      for (const sentence of sentences) {
        console.log(
          `🎯 Playing sentence: "${sentence.text}" in ${sentence.language}`
        );
        await synthesize(sentence.text, sentence.language, selectedVoices);
      }
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Audio-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎙️ PolyTalkie
          </h1>
          <p className="text-gray-600">
            Gemischter deutscher/englischer Text einfügen → Wörter sprechen und
            Entspannen
          </p>
        </header>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📝 Fügen Sie Ihren gemischten DE/EN Text ein:
            </label>
            <textarea
              className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Geben Sie hier Ihren gemischten deutschen und englischen Text ein..."
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
            />
          </div>

          {detectedWords.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Spracherkennung (Wörter zum Korrigieren anklicken):
              </label>

              {/* Legend positioned relative to voice detection box */}
              <div className="fixed top-70 right-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm z-10">
                <div className="flex items-center gap-1">
                  <span className="bg-red-200 text-red-900 px-2 py-1 rounded text-xs">
                    Deutsch
                  </span>
                  <span className="bg-blue-200 text-blue-900 px-2 py-1 rounded text-xs">
                    English
                  </span>
                  <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs border-b border-dashed border-gray-400">
                    Wort nicht aussprechen
                  </span>
                </div>
              </div>

              <div className="p-4 border border-gray-200 rounded-lg bg-white min-h-[120px] whitespace-pre-wrap">
                {detectedWords.map((word, index) => {
                  if (word.text === "\n") {
                    return <br key={index} />;
                  }

                  if (/^\s+$/.test(word.text)) {
                    return <span key={index}>{word.text}</span>;
                  }

                  return (
                    <span
                      key={index}
                      className={`inline-block m-0.5 px-1 py-0.5 rounded cursor-pointer transition-colors ${
                        word.language === "de"
                          ? "bg-red-200 hover:bg-red-300 text-red-900"
                          : word.language === "en"
                          ? "bg-blue-200 hover:bg-blue-300 text-blue-900"
                          : "bg-gray-200 hover:bg-gray-300 border-b border-dashed border-gray-400"
                      }`}
                      onClick={() => handleWordToggle(index)}
                      title={`Click to toggle language (currently: ${word.language})`}
                    >
                      {word.text}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🇺🇸 Englische Stimme:
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedVoices.en}
                onChange={(e) => {
                  console.log(`🇺🇸 English voice changed to: ${e.target.value}`);
                  setSelectedVoices((prev) => ({
                    ...prev,
                    en: e.target.value,
                  }));
                }}
                title="Select English voice"
              >
                {AVAILABLE_VOICES.filter((v) => v.language === "en").map(
                  (voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🇩🇪 Deutsche Stimme:
              </label>
              <select
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={selectedVoices.de}
                onChange={(e) => {
                  console.log(`🇩🇪 German voice changed to: ${e.target.value}`);
                  setSelectedVoices((prev) => ({
                    ...prev,
                    de: e.target.value,
                  }));
                }}
                title="Select German voice"
              >
                {AVAILABLE_VOICES.filter((v) => v.language === "de").map(
                  (voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name}
                    </option>
                  )
                )}
              </select>
            </div>{" "}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ⚡ Geschwindigkeit: {speed}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              title="Adjust speech speed"
            />
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={detectedWords.length === 0 || isGenerating}
              className="px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? "🔄 Generiere..." : "🎙️  Wörter sprechen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
