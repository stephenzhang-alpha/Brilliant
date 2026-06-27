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

export type HelpMode = 'hint' | 'explain';

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
  /** 'hint' = one nudge (no answer); 'explain' = short worked steps. */
  mode: HelpMode;
}

// Pip's personality + hard rules. Kept tight so responses stay short, kind, and
// age-appropriate, and never dump LaTeX or reveal the answer on a hint.
const SYSTEM_INSTRUCTION = `You are Pip, a cheerful, encouraging magical star-spirit who tutors middle-school students (around ages 11-14) learning beginning algebra.

Voice & rules:
- Warm, playful, and supportive — never condescending, never scary. A little sparkle/magic flavor is welcome but keep it brief.
- Use very simple, clear language a middle schooler understands.
- Write math in plain text / Unicode only (e.g. 2x + 3, x², ÷). NEVER use LaTeX, code blocks, or markdown headings.
- Be concise. No preamble like "Sure!" — just help.
- Stay strictly on the given question and topic.
- For a HINT: give ONE short nudge toward the next step. Do NOT state or reveal the correct answer.
- For an EXPLANATION: give a short, friendly step-by-step (2-4 quick steps) that reaches the correct answer, and gently note why the student's pick is a common mix-up.`;

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
      generationConfig: { temperature: 0.6, topP: 0.95, maxOutputTokens: 400 },
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
  const modeLine =
    r.mode === 'hint'
      ? `Give ONE short, friendly hint (1-2 sentences) that nudges the student toward the right idea. Do NOT reveal or state the correct answer.`
      : `Give a short, friendly step-by-step explanation (2-4 quick steps) that leads to the correct answer, and gently explain why "${r.userPickLabel}" is a tempting but wrong choice.`;

  return [
    `Topic: ${r.topic ?? 'beginning algebra'}.`,
    `Question: ${r.question}`,
    r.prompt ? `Context: ${r.prompt}` : '',
    `Answer choices: ${r.options.join(' | ')}.`,
    `The student chose "${r.userPickLabel}", which is WRONG.`,
    `The correct answer is "${r.correctLabel}".`,
    modeLine,
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
