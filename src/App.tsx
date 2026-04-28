import { useMemo, useState } from "react";
import { book, genericMarginalia, pageMarginalia, typoSwaps } from "./book";

type Mode = "oral" | "scribal" | "print";

const STORY_PAGES = book.length;
const TITLE = 0;
const PREFACE = 1;
const FIRST = 2;
const LAST = FIRST + STORY_PAGES - 1;
const COLOPHON = LAST + 1;
/** Page count: title, preface, story folios, then colophon. */
const TOTAL_PAGES = COLOPHON + 1;

const ROMAN = [
  "i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x",
  "xi", "xii", "xiii", "xiv", "xv",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const TYPO_MARGINALIA = [
  "the scribe made an error",
  "spelling error",
];

/** How often scribal mode tries to substitute a typo (when a swap matches). */
const TYPO_ATTEMPT_CHANCE = 0.45;

/**
 * After typo-specific marginalia are ruled out: chance we try *any* interpretive
 * note at all. Combined with page-vs-generic splits below (~82% yield a note
 * inside this branch), targets ~two-thirds of folios bearing an interpretive
 * marginalium — margins are often intentionally empty like real MSS.
 */
const MARGINALIA_INTERPRETIVE_GATE = 0.79;

function pickScribalMarginalNote(
  hadTypo: boolean,
  storyIndex: number
): string | null {
  // Only some pages with a typo get an error-specific remark; the rest use
  // page-tied or generic interpretive pools.
  if (hadTypo && Math.random() < 0.35) {
    return pick(TYPO_MARGINALIA);
  }
  if (Math.random() > MARGINALIA_INTERPRETIVE_GATE) {
    return null;
  }
  let note: string | null = null;
  const pageNotes = pageMarginalia[storyIndex];

  if (pageNotes && pageNotes.length > 0 && Math.random() < 0.7) {
    note = pick(pageNotes);
  } else if (Math.random() < 0.4) {
    note = pick(genericMarginalia);
  } else {
    note = null;
  }
  return note;
}

// Replace the first listed word that appears in the sentence with its typo
// twin. The replacement preserves the original capitalization so a typoed
// sentence still starts with a capital letter when it needs to.
function maybeTypo(s: string): { text: string; hadTypo: boolean } {
  const pool = [...typoSwaps].sort(() => Math.random() - 0.5);
  for (const [from, to] of pool) {
    const re = new RegExp(`\\b${from}\\b`, "i");
    if (re.test(s)) {
      const text = s.replace(re, (m) =>
        m[0] === m[0].toUpperCase() ? to[0].toUpperCase() + to.slice(1) : to
      );
      return { text, hadTypo: true };
    }
  }
  return { text: s, hadTypo: false };
}

function randomSentence(i: number): string {
  return pick(book[i].variations);
}

// Apply scribal-mode corruption to a sentence: a typo, and occasionally an
// inline insertion that mimics a later editor's note interrupting the line.
function applyScribal(s: string): { text: string; hadTypo: boolean } {
  let hadTypo = false;
  if (Math.random() < TYPO_ATTEMPT_CHANCE) {
    const r = maybeTypo(s);
    s = r.text;
    hadTypo = r.hadTypo;
  }
  if (Math.random() < 0.2) {
    const insertion = pick(["(text unclear)", "(added later)"]);
    s = `${s.replace(/\.$/u, "")} ${insertion}.`;
  }
  return { text: s, hadTypo };
}

function fullRun(mode: Mode) {
  const texts: string[] = [];
  const notes: (string | null)[] = [];
  for (let i = 0; i < STORY_PAGES; i++) {
    let s = randomSentence(i);
    let n: string | null = null;
    if (mode === "scribal") {
      const scribal = applyScribal(s);
      s = scribal.text;
      n = pickScribalMarginalNote(scribal.hadTypo, i);
    }
    texts.push(s);
    notes.push(n);
  }
  return { texts, notes };
}

export default function App() {
  const [pageIndex, setPageIndex] = useState<number>(TITLE);
  const [mode, setMode] = useState<Mode>("oral");

  const initial = useMemo(() => fullRun("oral"), []);
  const [texts, setTexts] = useState<string[]>(initial.texts);
  const [notes, setNotes] = useState<(string | null)[]>(initial.notes);
  const [fixed, setFixed] = useState<string[] | null>(null);
  const [versions, setVersions] = useState<number>(1);
  const [prevText, setPrevText] = useState<string | null>(null);
  const [isFading, setIsFading] = useState<boolean>(false);
  const [visitedPages, setVisitedPages] = useState<Set<number>>(new Set());

  const isStory = pageIndex >= FIRST && pageIndex <= LAST;
  const storyIndex = pageIndex - FIRST;

  const display = mode === "print" && fixed ? fixed : texts;
  const currentText = isStory ? display[storyIndex] : "";
  const currentNote = mode === "scribal" && isStory ? notes[storyIndex] : null;

  const storyBodyClassName = `text-xl md:text-2xl text-justify hyphens-auto transition-all duration-200 ${
    mode === "oral"
      ? "leading-relaxed tracking-wide text-stone-700"
      : mode === "scribal"
        ? "leading-relaxed tracking-[0.02em] text-[1.08em] font-medium text-stone-900"
        : "leading-snug tracking-tight text-stone-900"
  }`;
  const storyBodyStyle =
    mode === "scribal"
      ? ({ fontFamily: "'Georgia', serif" } as const)
      : ({ fontFamily: "'Times New Roman', serif" } as const);

  // Catchword: the first word of the NEXT story page, printed at the bottom
  // match what the next page actually says once you turn it -- which is the
  // whole point.
  const catchword = useMemo(() => {
    if (!isStory) return null;
    const next = storyIndex + 1;
    if (next >= STORY_PAGES) return null;
    const sentence = display[next] ?? "";
    const first = sentence.split(/\s+/)[0] ?? "";
    return first.replace(/[.,;:!?\u2014\u2018\u2019\u201C\u201D]+$/u, "") || null;
  }, [isStory, storyIndex, display]);

  function goto(target: number) {
    const next = Math.max(0, Math.min(TOTAL_PAGES - 1, target));
    if (next === pageIndex) return;

    const advance = () => {
      let capturedPrev: string | null = null;

      if (mode !== "print" && next >= FIRST && next <= LAST) {
        const si = next - FIRST;
        const newTexts = texts.slice();
        const newNotes = notes.slice();
        // Save the OLD value at this story slot before overwriting it,
        // so oral mode can show the prior telling struck through.
        capturedPrev = newTexts[si] ?? null;
        let s = randomSentence(si);
        let hadTypo = false;
        if (mode === "scribal") {
          if (Math.random() < TYPO_ATTEMPT_CHANCE) {
            const result = maybeTypo(s);
            s = result.text;
            hadTypo = result.hadTypo;
          }
          newNotes[si] = pickScribalMarginalNote(hadTypo, si);
        } else {
          newNotes[si] = null;
        }
        newTexts[si] = s;
        setTexts(newTexts);
        setNotes(newNotes);
        setVersions((v) => v + 1);
      }

      // Only oral mode surfaces the previous telling.
      setPrevText(mode === "oral" ? capturedPrev : null);
      setVisitedPages((prev) => {
        const copy = new Set(prev);
        copy.add(pageIndex);
        return copy;
      });
      setPageIndex(next);
    };

    if (mode === "oral") {
      setIsFading(true);
      window.setTimeout(() => {
        advance();
        setIsFading(false);
      }, 150);
    } else {
      advance();
    }
  }

  function changeMode(m: Mode) {
    if (m === mode) return;
    setPrevText(null);
    if (m === "print") {
      const snap = Array.from({ length: STORY_PAGES }, (_, i) => randomSentence(i));
      setFixed(snap);
      setMode("print");
      setVersions((v) => v + 1);
      return;
    }
    const { texts: t, notes: n } = fullRun(m);
    setTexts(t);
    setNotes(n);
    setFixed(null);
    setMode(m);
    setVersions((v) => v + 1);
  }

  const progress = ((pageIndex + 1) / TOTAL_PAGES) * 100;

  function handleBookPointerClick(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const goPrev = x < rect.width / 2;
    if (goPrev) {
      if (pageIndex > 0) goto(pageIndex - 1);
    } else if (pageIndex === TOTAL_PAGES - 1) {
      goto(TITLE);
    } else {
      goto(pageIndex + 1);
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center px-4 py-10 md:py-14">
      <div
        className="pointer-events-none absolute top-4 right-4 z-10 max-w-[min(19rem,calc(100vw-2rem))] rounded-sm border border-stone-500/55 bg-page/95 px-3 py-3 sm:px-4 shadow-md shadow-stone-900/15 backdrop-blur-[2px] text-left leading-snug"
      >
        <div className="flex items-start gap-2 sm:gap-2.5">
          <svg
            className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-900/65 sm:h-5 sm:w-5 sm:text-amber-900/55"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            {/* Glass + faint “lit” fill, threaded base */}
            <ellipse
              cx="12"
              cy="11"
              rx="5.5"
              ry="7"
              fill="rgba(251, 191, 36, 0.12)"
              stroke="currentColor"
              strokeWidth="1.35"
              strokeLinejoin="round"
            />
            <path
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              d="M9 21h6"
            />
            <path
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 17.75h4.5a.75.75 0 0 1 .75.75v.5a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-.5a.75.75 0 0 1 .75-.75Z"
            />
          </svg>
          <p className="font-serif text-[0.8125rem] sm:text-sm text-stone-700">
            Click or tap the <span className="text-stone-900">left</span> or{" "}
            <span className="text-stone-900">right</span> half of the page to
            turn&nbsp;backward or forward.
          </p>
        </div>
      </div>

      {/* Top strip: title + current mode */}
      <div className="w-full max-w-2xl mb-6 text-center smcp text-stone-600 text-xs">
        The Many Tellings of Little Red Riding Hood
        <span className="mx-3 text-stone-400">·</span>
        <span className="text-stone-800">{mode} mode</span>
      </div>

      {/* The page — fixed-size card, flex column so the footer always sits
          at the bottom and the body area stays a consistent height whether
          it holds the title, a story sentence, or the colophon. */}
      <article
        className="paper page-card relative w-full max-w-2xl rounded-sm px-10 md:px-20 py-14 md:py-20 flex flex-col cursor-default"
        onClick={handleBookPointerClick}
      >
        {/* Running head slot. Two lines on story pages: the book title
            and a small mode caption that lives in the page chrome rather
            than alongside the body text. Reserved height keeps the layout
            stable on the title and colophon pages. */}
        <div className="h-10 mb-8">
          {isStory && (
            <>
              <div className="smcp text-center text-stone-600 text-[0.7rem]">
                The Many Tellings of Little Red Riding Hood
              </div>
              <div className="text-center italic text-[0.7rem] text-stone-500 mt-1">
                {mode === "oral" && "this telling differs from the last"}
                {mode === "scribal" && "copied by a scribe"}
                {mode === "print" && "authorized edition"}
              </div>
            </>
          )}
        </div>

        {/* Body area: fills the card — full-width text unless scribal marginalia,
            where we use the 10% | 70% | 20% band on md+. */}
        <div className="relative flex-1 flex flex-col justify-center">
          {pageIndex === TITLE && (
            <div className="flex flex-col items-center justify-center text-center">
              <h1 className="text-4xl md:text-5xl leading-tight tracking-wide">
                The Many Tellings of Little Red Riding Hood
              </h1>
              <div className="my-9 h-px w-40 md:w-48 max-w-[80%] shrink-0 bg-stone-500/70 mx-auto" />
              <p className="smcp text-stone-700">Compiled by Nischal Tamang</p>
            </div>
          )}

        {pageIndex === PREFACE && (
          <div className="flex flex-col items-center justify-center text-sm text-center max-w-md mx-auto">
            <p className="smcp text-stone-600 mb-6 text-xs">Preface / Note on the Book</p>

            <p className="text-lg md:text-xl italic leading-relaxed">
              This book does not contain a single, fixed version of its text.
            </p>

            <p className="mt-3 text-base leading-relaxed">
              Every read produces a different arrangement of words,
              which reflects how stories have historically been
              altered and reinterpreted over time.
            </p>

            <p className="mt-3 text-base leading-relaxed">
              In oral traditions, stories often change with each performance.
              In manuscripts, scribes introduce variations and
              errors, and readers add commentary. In print, texts appear stable and fixed.
            </p>
            
            <p className="mt-3 text-base leading-relaxed">
              These are reflected by the different modes of reading that you can select below.
              Essentially, it relies on the digital platform that allows the text to change dynamically.
            </p>

            <p className="mt-3 text-base leading-relaxed">
              The story of Little Red Riding Hood is particularly suited for this platform, 
              as it has evolved over timeas a set of variations shaped across oral, manuscript, and print traditions.
            </p>

            <p className="mt-3 text-base leading-relaxed italic">
              The text you are reading is not definitive. It is one
              of many version.
            </p>
          </div>
        )}

          {isStory && mode === "scribal" && currentNote ? (
            <div className="flex w-full min-w-0 flex-col md:flex-row md:items-start md:justify-between md:gap-x-4">
              <div className="min-w-0 w-full flex-1 pr-0 md:pr-2">
                <p
                  className={`block w-full ${storyBodyClassName}`}
                  style={storyBodyStyle}
                >
                  {currentText}
                </p>

                <aside className="md:hidden mt-5 text-xs italic leading-snug text-stone-600 wrap-break-word hyphens-auto max-w-full">
                  {currentNote}
                </aside>
              </div>

              <aside className="mt-6 hidden shrink-0 self-start text-[0.65rem] leading-snug text-stone-600 italic wrap-break-word hyphens-auto md:mt-0 md:block md:-mr-1 md:w-20 md:max-w-20 md:translate-x-4 md:text-right md:leading-snug">
                {currentNote}
              </aside>
            </div>
          ) : (
            isStory && (
              <div>
                {mode === "oral" &&
                  prevText &&
                  visitedPages.has(pageIndex) &&
                  prevText !== currentText && (
                  <p className="text-sm text-stone-400 line-through mb-3 leading-relaxed">
                    {prevText}
                  </p>
                )}

                <p
                  className={`${storyBodyClassName} ${
                    mode === "oral" && isFading ? "opacity-0" : "opacity-100"
                  }`}
                  style={storyBodyStyle}
                >
                  {currentText}
                </p>

                {mode === "scribal" && currentNote && (
                  <aside className="md:hidden mt-5 text-xs italic leading-snug text-stone-600 wrap-break-word hyphens-auto max-w-full">
                    {currentNote}
                  </aside>
                )}
              </div>
            )
          )}

          {pageIndex === COLOPHON && (
            <div className="flex flex-col items-center justify-center text-center">
              <p className="smcp text-stone-600 mb-6 text-xs">Colophon</p>
              <p className="text-lg md:text-xl italic leading-relaxed max-w-md">
                &ldquo;This book does not have a single, definitive version. So, if you are using oral or scribal mode, be sure to go back and read it again to get the full experience.
              </p>
              <p className="text-lg md:text-xl italic leading-relaxed max-w-md">
                Print mode will always show the same, fixed version of the text used for reproduction.&rdquo;
              </p>
              <div className="my-8 w-10 h-px bg-stone-500/60" />
              <p className="smcp text-stone-700 text-xs">— Nischal Tamang</p>
            </div>
          )}
        </div>

        {/* Page footer: signature | folio | catchword */}
        <div className="mt-10 grid grid-cols-3 items-end text-[0.72rem] text-stone-500">
          <span className="justify-self-start italic">
            {isStory ? `[A · ${ROMAN[storyIndex]}]` : "\u00A0"}
          </span>
          <span className="justify-self-center">
            {pageIndex + 1}
          </span>
          <span className="justify-self-end italic text-right leading-tight">
            {mode !== "oral" && isStory && catchword && (
              <>
                {catchword}
                {mode === "scribal" && (
                  <span className="block text-[0.65rem] text-stone-400">
                    (uncertain)
                  </span>
                )}
                {mode === "print" && (
                  <span className="block text-[0.65rem] text-stone-500">
                    (verified)
                  </span>
                )}
              </>
            )}
          </span>
        </div>

        {mode === "print" && isStory && (
          <p className="mt-2 text-center italic text-[0.7rem] text-stone-500">
            This version has been fixed for reproduction.
          </p>
        )}
      </article>

      {/* Controls */}
      <div className="w-full max-w-2xl mt-8 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => goto(pageIndex - 1)}
          disabled={pageIndex === 0}
          className="smcp text-xs cursor-pointer px-4 py-2 rounded-sm border border-stone-700/60 bg-stone-900/5 text-stone-900 hover:bg-stone-900/15 hover:border-stone-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-stone-900/5 disabled:hover:border-stone-700/60"
        >
          ‹ Previous
        </button>

        <div className="flex items-center gap-2">
          {(["oral", "scribal", "print"] as Mode[]).map((m) => {
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => changeMode(m)}
                className={
                  "smcp text-xs cursor-pointer px-4 py-2 rounded-sm border transition-colors " +
                  (active
                    ? "bg-stone-900 border-stone-900 text-stone-50"
                    : "bg-stone-900/5 border-stone-700/60 text-stone-900 hover:bg-stone-900/15 hover:border-stone-900")
                }
              >
                {m}
              </button>
            );
          })}
        </div>

        {pageIndex === TOTAL_PAGES - 1 ? (
          <button
            type="button"
            onClick={() => goto(TITLE)}
            className="smcp text-xs cursor-pointer px-4 py-2 rounded-sm border border-stone-700/60 bg-stone-900/5 text-stone-900 hover:bg-stone-900/15 hover:border-stone-900 transition-colors"
          >
            Return to title page
          </button>
        ) : (
          <button
            type="button"
            onClick={() => goto(pageIndex + 1)}
            className="smcp text-xs cursor-pointer px-4 py-2 rounded-sm border border-stone-700/60 bg-stone-900/5 text-stone-900 hover:bg-stone-900/15 hover:border-stone-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-stone-900/5 disabled:hover:border-stone-700/60"
          >
            Next ›
          </button>
        )}
      </div>

      {/* Reading progress (Kindle-style) */}
      <div className="mt-5 w-full max-w-2xl h-px bg-stone-500/25">
        <div
          className="h-full bg-stone-700/70 transition-[width] duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="mt-3 text-xs italic text-stone-500">
        {mode === "oral"
          ? `Telling ${versions}`
          : `${versions} ${versions === 1 ? "version" : "versions"} generated`}
      </p>
    </div>
  );
}
