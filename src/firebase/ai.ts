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
- Use very simple, clear language a middle schooler understands. 2-3 short sentences.
- Write math in plain text / Unicode only (e.g. 2x + 3, x², ÷). NEVER use LaTeX, code blocks, or markdown.
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
      generationConfig: { temperature: 0.5, topP: 0.9, maxOutputTokens: 250 },
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
    `Re-explain that SAME idea a different, simpler way so it clicks — a fresh angle or a tiny everyday analogy, 2-3 short sentences. Do NOT change the math or the correct answer, and do not contradict the explanation above.`,
  ]
    .filter(Boolean)
    .join('\n');
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
  let text = '';
  for await (const chunk of result.stream) {
    if (signal?.aborted) break;
    const piece = chunk.text();
    if (piece) {
      text += piece;
      onChunk(text);
    }
  }
  return text.trim();
}
