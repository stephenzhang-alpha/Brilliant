// ---------------------------------------------------------------------------
// Firebase AI Logic — the magical assistant's brain (Gemini)
//
// Wraps Firebase AI Logic (Gemini Developer API) behind a tiny, lazily-initialized
// helper. When Firebase isn't configured (placeholder keys) or the SDK can't
// initialize / a call fails, callers fall back to the authored hint text — so
// the assistant always helps, even offline. See `MagicAssistant` for the UI.
// ---------------------------------------------------------------------------

import type { GenerativeModel } from 'firebase/ai';
import { app, isFirebaseConfigured } from './config';
import { verifyExplanation } from './verifyExplanation';

/**
 * Optional, data-driven ground truth for a computable question, used by the
 * deterministic verifier so it compares AI guidance against DATA (not parsed
 * prose). Backward-compatible: questions without it still verify against the
 * other sources on the request.
 */
export interface AnswerMeta {
  /** Canonical correct value (matches the correct option's label, e.g. "14"). */
  value: string;
  /**
   * Numbers that may legitimately appear in a correct worked solution —
   * operands, intermediate results, and the final answer — so faithful steps
   * aren't flagged by the number-consistency check (e.g. [3, 4, 2, 12, 14]).
   */
  allowedNumbers?: number[];
}

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
  /** Optional data-driven ground truth for computable questions (verifier). */
  answer?: AnswerMeta;
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

/**
 * Lazily import the Gemini SDK + build the model (cached), or null if unusable.
 * The `firebase/ai` SDK is dynamically imported so it is NOT in the initial
 * bundle — it only loads the first time a learner asks Pip to "explain another
 * way".
 */
async function getModel(): Promise<GenerativeModel | null> {
  if (model) return model;
  if (initFailed || !isFirebaseConfigured || !app) return null;
  try {
    const { getAI, getGenerativeModel, GoogleAIBackend } = await import('firebase/ai');
    const ai = getAI(app, { backend: new GoogleAIBackend() });
    // `gemini-flash-latest` is the model this project's AI Logic (Gemini Developer
    // API) backend serves. It is a "thinking" model that spends output tokens on
    // internal reasoning before the reply, so a tight cap gets consumed by that
    // reasoning and truncates Pip's short answer — give a generous budget that
    // comfortably fits the reasoning AND the 1-3 sentence reply. (verifyExplanation
    // still gates the result, and the authored tip is the always-correct fallback.)
    model = getGenerativeModel(ai, {
      model: 'gemini-flash-latest',
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: { temperature: 0.4, topP: 0.9, maxOutputTokens: 2048 },
    });
    return model;
  } catch {
    initFailed = true;
    return null;
  }
}

/**
 * True when the live AI assistant can be used. Config-based (synchronous) so the
 * UI can decide whether to show the "Explain another way" button without pulling
 * in the Gemini SDK; the SDK loads lazily on first use, and any load/init failure
 * surfaces as a thrown error that callers fall back from.
 */
export function isAssistantAvailable(): boolean {
  return isFirebaseConfigured && !!app && !initFailed;
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
 * Strip stray markdown / LaTeX / label artifacts the model sometimes emits
 * despite the instructions (e.g. "**(Box/Container):** ..." or "\\frac{1}{2}"),
 * so the UI shows clean Unicode prose. Exported so the verifier's tests can
 * assert the exact sanitization the validate-then-reveal pipeline relies on.
 */
export function clean(text: string): string {
  let t = text
    // LaTeX delimiters: \( \) \[ \]
    .replace(/\\[()[\]]/g, '')
    // \frac{a}{b} -> a/b, then drop any stray \frac
    .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '$1/$2')
    .replace(/\\frac\b/g, '')
    // common LaTeX operators -> Unicode equivalents
    .replace(/\\times\b/g, '×')
    .replace(/\\div\b/g, '÷')
    .replace(/\\cdot\b/g, '·')
    // superscripts / subscripts: ^{...} or _{...} -> their contents
    .replace(/[\^_]\{([^{}]*)\}/g, '$1')
    // any remaining LaTeX command (\left, \alpha, …)
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/```+/g, '') // code fences
    .replace(/`/g, '') // inline code ticks
    .replace(/~~/g, '') // strikethrough
    .replace(/\*+/g, '') // bold / italic asterisks
    .replace(/^\s{0,3}#{1,6}\s*/gm, '') // headings
    .replace(/^\s{0,3}>+\s*/gm, '') // blockquotes
    .replace(/^\s*\|?[ :|-]*-{3,}[ :|-]*\|?\s*$/gm, '') // table separator rows
    .replace(/^\s*\|.*\|\s*$/gm, '') // table data / header rows
    .replace(/^\s*\d+\.\s+/gm, '') // ordered-list markers
    .replace(/^\s*[-•]\s+/gm, '') // bullet markers
    .replace(/\s*\n\s*/g, ' ') // collapse newlines into spaces
    .replace(/\s{2,}/g, ' ') // collapse runs of spaces
    .trim();
  // Conservatively drop a leading category label like "(Box/Container): " or
  // "Variable: " — a single spaceless token (optionally parenthesized) before
  // the first colon, at the very start (so real sentences with a colon survive).
  t = t.replace(/^\(?[^\s.!?:]{1,24}\)?:\s+(?=[A-Za-z0-9])/, '');
  return t.trim();
}

/**
 * VALIDATE-THEN-REVEAL: generate the assistant's help, then gate it.
 *
 * Unlike the old streaming reveal, NOTHING is shown until the full text has been
 * (1) generated (buffered, non-streaming), (2) `clean()`ed, and (3) checked by
 * the deterministic `verifyExplanation` against the known-correct sources. If
 * verification fails the promise REJECTS so the caller falls back to the
 * authored tip — an unverified explanation is never returned. Pass an optional
 * `signal` to cancel an in-flight request (e.g. on unmount). Resolves to the
 * validated text; throws if the assistant is unavailable, aborted, the request
 * fails, or the output can't be verified.
 */
export async function generateQuestionHelp(
  request: HelpRequest,
  signal?: AbortSignal,
): Promise<string> {
  const m = await getModel();
  if (!m) throw new Error('assistant-unavailable');

  const result = await m.generateContent(buildPrompt(request), { signal });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const text = clean(result.response.text());
  const verdict = verifyExplanation(text, request);
  if (!verdict.ok) {
    throw new Error(`verification-failed: ${verdict.reason ?? 'unknown'}`);
  }
  return text;
}
