# 1) Project Title & One-Line Summary

**PolySpeak Minimal** — Paste mixed German/English text, auto-detect language per word, let user correct, then generate one downloadable MP3 with the correct voices in sequence.

---

# 2) Goals & Value Proposition

- **Goal:** Convert mixed German/English text into one continuous MP3 with correct voices.
- **Value:** Zero backend, zero cost, minimal interface — fast text → audio workflow.

---

# 3) Core Features (MVP only)

- Paste/import large text into a textarea.
- Automatic **word-level** DE/EN detection.
- Highlight words inline; click to flip language.
- Pick **one German** and **one English** voice.
- Client-side synthesis → concatenate → **downloadable MP3**.
- Auto-save current session locally.

---

# 4) User Journey (Vertical Flow)

1. **Paste Text** → textarea input.
2. **Detection** → each word highlighted (blue=EN, yellow=DE, underline=ambiguous).
3. **Review** → user clicks words to flip language if wrong.
4. **Configure** → select German voice, English voice, optional speed.
5. **Generate** → synthesize by sentence, stitch, encode MP3.
6. **Download** → single MP3 file.

---

# 5) Tech Stack (flat, minimal, \$0)

- **App:** React + Vite + TypeScript.
- **Styling:** Tailwind CSS.
- **Language Detection:** `tinyld` (per word).
- **TTS:** Piper TTS (WASM) with exactly 2 models (DE + EN) in `/public/models/`.
- **Audio:** Web Audio API (assemble PCM) + `lamejs` (encode MP3).
- **Deploy:** Vercel static build.
- **Storage:** `localStorage` (auto-save).

---

# 6) System Architecture (High-Level)

- **No backend. Single-page app.**
- Modules:

  - `detect.ts` → run `tinyld` per word.
  - `voices.ts` → lazy-load Piper WASM + DE/EN models.
  - `synth.ts` → per sentence, join words of same language → synthesize → cache.
  - `concat.ts` → merge buffers + encode MP3 via `lamejs`.

- **State:** React `useState`.

---

# 7) Design & UX Notes

- **Layout:** Vertical flow, one page:

  1. Textarea
  2. Highlighted detection view
  3. Voice pickers + speed slider
  4. Generate button + Download link

- **UI:** Minimal Tailwind, clear colors for DE/EN, underline for ambiguous.
- **Accessibility:** Click or keyboard flip word language.

---

# 8) Roadmap / Phases

- **MVP:** Paste → detect → review → pick voices → generate MP3 → download.
- **v1.0 polish (optional):** Faster batching for very large texts.

---

# 9) Setup Instructions

**Prereqs**: Node 20+, pnpm.

```bash
pnpm create vite@latest polyspeak --template react-ts
cd polyspeak
pnpm add tinyld lamejs
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Tailwind**

- `tailwind.config.js` → `content: ["./index.html","./src/**/*.{ts,tsx}"]`
- `src/index.css` →

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Add models**

- Place Piper WASM + **2 models only** (`de`, `en`) into `public/models/`.
- Create `voices.ts` → `synthesize(text: string, lang: "de"|"en")` → returns Float32Array.

**Build/Deploy**

```bash
pnpm build
vercel --prod
```

---

# 10) Risks & Considerations

- **Model size:** 20–90 MB each; load lazily on first Generate.
- **Quality:** Good enough, not studio-grade; keep sentences short.
- **Performance:** Very large texts may take minutes; simple sentence batching mitigates.
- **Browser:** Works best in Chrome. Safari/WebKit may need testing.
- **Licensing:** Verify chosen DE/EN models.
