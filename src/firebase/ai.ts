// ---------------------------------------------------------------------------
// Firebase AI Logic — the magical assistant's brain (Gemini)
//
// Wraps Firebase AI Logic (Gemini Developer API) behind a tiny, lazily-initialized
// helper. When Firebase isn't configured (placeholder keys) or the SDK can't
// initialize / a call fails, callers fall back to the authored hint text — so
// the assistant always helps, even offline. See `MagicAssistant` for the UI.
// ---------------------------------------------------------------------------

import { getAI, getGenerativeModel, GoogleAIBackend, type GenerativeModel } from 'firebase/ai';
import { app, isFirebaseConfigured } from './config';

export interface HelpRequest {
  /** The lesson topic, e.g. "variables" or "equations and inequalities". */
  topic?: string;
  /** The question prompt the student answered. */
  question: string;
  /** Optional extra line shown with the question. */
  prompt?: string;
  /** All answer choice labels. */
  options: string[];
  /** The (wrong) answer the student chose. */
  userPickLabel: string;
  /** The correct answer's label. */
  correctLabel: string;
  /**
   * The authored, known-correct explanation the student already saw. The model's
   * ONLY job is to re-explain THIS in a different, simpler way — it grounds the
   * response so the AI can't drift into wrong math or a different answer.
   */
  authoredExplanation: string;
}

// Pip's personality + hard rules. The model never reasons about the answer from
// scratch — it only rephrases the authored explanation it is given, so it stays
// correct, short, kind, and age-appropriate (and never dumps LaTeX).
const SYSTEM_INSTRUCTION = `You are Pip, a cheerful, encouraging magical star-spirit who tutors middle-school students (around ages 11-14) learning beginning algebra.

You are given a question the student answered incorrectly and a CORRECT explanation a teacher already wrote. Your ONLY job is to re-explain that same correct idea a DIFFERENT, simpler way so it finally clicks.

Voice & rules:
- Warm, playful, and supportive — never condescending, never scary. A little sparkle/magic flavor is welcome but keep it brief.
- Use very simple, clear language a middle schooler understands.
- Reply with ONLY 1-3 plain sentences and nothing else. Begin DIRECTLY with the explanation — never start with a label, category, or heading (no "Variable:", no "(Box/Container):", etc.).
- Plain prose ONLY: no markdown, no asterisks or bold, no headings, no bullet points, no code. Write math in plain text / Unicode (e.g. 2x + 3, x², ÷) — never LaTeX.
- No preamble like "Sure!" — just help.
- Re-explain the SAME idea with a fresh angle or a tiny everyday analogy. NEVER change the math, the method, or the correct answer, and never contradict the explanation you were given.
- Stay strictly on this one question. Do not invent new problems, numbers, or answer choices.`;

let model: GenerativeModel | null = null;
let initFailed = false;

/** Lazily build the Gemini model, or return null if it can't be used. */
function getModel(): GenerativeModel | null {
  if (model) return model;
  if (initFailed || !isFirebaseConfigured || !app) return null;
  try {
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    model = getGenerativeModel(ai, {
      model: 'gemini-flash-latest',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 250 },
    });
    return model;
  } catch {
    initFailed = true;
    return null;
  }
}

/** True when the live AI assistant can be used (config present + SDK init OK). */
export function isAssistantAvailable(): boolean {
  return getModel() !== null;
}

function buildPrompt(r: HelpRequest): string {
  return [
    `Topic: ${r.topic ?? 'beginning algebra'}.`,
    `Question: ${r.question}`,
    r.prompt ? `Context: ${r.prompt}` : '',
    `Answer choices: ${r.options.join(' | ')}.`,
    `The student chose "${r.userPickLabel}", which is wrong; the correct answer is "${r.correctLabel}".`,
    `A correct explanation the student already saw: "${r.authoredExplanation}"`,
    `Re-explain that SAME idea a different, simpler way so it clicks — a fresh angle or a tiny everyday analogy, in 1-3 plain sentences. Begin directly with the explanation (no label or heading), use no markdown or asterisks, and do NOT change the math or the correct answer or contradict the explanation above.`,
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * Strip stray markdown / label artifacts the model sometimes emits despite the
 * instructions (e.g. "**(Box/Container):** ..."), so the UI shows clean prose.
 */
function clean(text: string): string {
  let t = text
    .replace(/```+/g, '') // code fences
    .replace(/`/g, '') // inline code ticks
    .replace(/\*+/g, '') // bold / italic asterisks
    .replace(/^\s{0,3}#{1,6}\s*/gm, '') // headings
    .replace(/^\s{0,3}>+\s*/gm, '') // blockquotes
    .replace(/^\s*[-•]\s+/gm, '') // bullet markers
    .replace(/\s*\n\s*/g, ' ') // collapse newlines into spaces
    .trim();
  // Conservatively drop a leading category label like "(Box/Container): " or
  // "Variable: " — a single spaceless token (optionally parenthesized) before
  // the first colon, at the very start (so real sentences with a colon survive).
  t = t.replace(/^\(?[^\s.!?:]{1,24}\)?:\s+(?=[A-Za-z0-9])/, '');
  return t.trim();
}

/**
 * Stream the assistant's help. `onChunk` receives the cumulative text as it
 * arrives (for a typing effect). Pass an optional `signal` to cancel an
 * in-flight stream (e.g. when the component unmounts) — aborting stops the
 * stream loop and rejects with an `AbortError`. Resolves to the final text;
 * throws if the assistant is unavailable or the request fails (callers should
 * fall back).
 */
export async function streamQuestionHelp(
  request: HelpRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const m = getModel();
  if (!m) throw new Error('assistant-unavailable');

  const result = await m.generateContentStream(buildPrompt(request), { signal });
  let raw = '';
  for await (const chunk of result.stream) {
    if (signal?.aborted) break;
    const piece = chunk.text();
    if (piece) {
      raw += piece;
      onChunk(clean(raw)); // show sanitized text as it streams
    }
  }
  return clean(raw);
}
