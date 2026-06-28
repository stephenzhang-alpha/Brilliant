// ---------------------------------------------------------------------------
// Deterministic verification of AI-generated math guidance.
//
// `verifyExplanation` is a PURE, side-effect-free gate (no I/O, no Gemini) run
// on the model's already-`clean()`ed text BEFORE it is ever shown to a learner.
// It compares the text against the known-correct, authored sources carried on
// the `HelpRequest` and rejects clear contradictions, so the assistant can fall
// back to the authored tip instead of revealing wrong math.
//
// It is intentionally CONSERVATIVE: faithful rephrasings / analogies pass, and
// only obvious problems are rejected (a false reject merely shows the authored
// tip; a false accept could teach a wrong answer — so we never pass an
// obviously wrong FINAL answer, but we don't nitpick incidental numbers).
// ---------------------------------------------------------------------------

import type { HelpRequest } from './ai';

export interface VerifyResult {
  /** True when the text is safe to show. */
  ok: boolean;
  /** Short machine/log-friendly reason when `ok` is false. */
  reason?: string;
}

// --- normalization ---------------------------------------------------------

/** Unify operator/sign/quote glyphs so comparisons survive Unicode variants. */
function unifyGlyphs(s: string): string {
  return s
    .replace(/[\u2018\u2019\u02bc]/g, "'") // ‘ ’ ʼ → '
    .replace(/[\u2212\u2013\u2014]/g, '-') // − – — → -
    .replace(/[×\u00d7\u22c5\u2715\u2716\u2217\u00b7]/g, '*') // × · ✕ ✖ ∗ → *
    .replace(/[÷\u00f7]/g, '/'); // ÷ → /
}

/** Lowercased, operator-unified, single-spaced — for scanning prose. */
function normText(s: string): string {
  return unifyGlyphs(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Lowercased, operator-unified, whitespace-stripped — for comparing short
 *  answer labels/values (so "5 x" and "5x" compare equal). */
function normValue(s: string): string {
  return unifyGlyphs(s).toLowerCase().replace(/\s+/g, '').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A boundary-safe, operator-unified regex source for an answer label. */
function labelSource(label: string): string {
  return escapeRegExp(unifyGlyphs(label).toLowerCase().trim()).replace(/\s+/g, '\\s+');
}

/** Every integer/decimal magnitude appearing in a string (sign-agnostic). */
function numbersIn(s: string): number[] {
  const out: number[] = [];
  for (const m of unifyGlyphs(s).matchAll(/\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
  return out;
}

/**
 * Numbers that may legitimately appear in a correct worked solution — pulled
 * from the deterministic sources (question, prompt, correct label, authored
 * tip) plus any explicit answer metadata (operands, intermediate steps, final
 * answer). The number-consistency check only flags result-numbers OUTSIDE this
 * set, so faithful intermediate arithmetic isn't penalized.
 */
function allowedNumberSet(r: HelpRequest): Set<number> {
  const set = new Set<number>();
  const sources = [r.question, r.prompt ?? '', r.correctLabel, r.authoredExplanation];
  for (const src of sources) for (const n of numbersIn(src)) set.add(n);
  if (r.answer) {
    if (r.answer.value) for (const n of numbersIn(r.answer.value)) set.add(n);
    if (r.answer.allowedNumbers) for (const n of r.answer.allowedNumbers) set.add(n);
  }
  return set;
}

// A number-led answer value, optionally with a trailing variable/superscript
// (covers "14", "4", "16", "5x", "5x²").
const VALUE = '[-]?\\d+(?:\\.\\d+)?[a-z]?[²³]?';

// --- individual checks -----------------------------------------------------

/** (d) FORMAT — residual LaTeX, markdown tables, or headings must not survive. */
function formatReason(text: string): string | null {
  if (/\\\(|\\\)|\\\[|\\\]|\\frac|\\times|\\div|\^\{|_\{/.test(text)) {
    return 'contains residual LaTeX markup';
  }
  if (/(^|\n)\s{0,3}#{1,6}\s/.test(text)) return 'contains a markdown heading';
  if (/(^|\n)\s*\|.*\|/.test(text) || /(^|\n)\s*\|?\s*:?-{3,}:?\s*\|/.test(text)) {
    return 'contains a markdown table';
  }
  return null;
}

/**
 * (a) FINAL-ANSWER CONSISTENCY — when the text explicitly asserts a final
 * answer value, it must equal `correctLabel`. Catches a wrong value even when
 * that value happens to be a legitimate number from the problem (e.g. asserting
 * the substituted variable "4" as the answer instead of "14").
 */
function finalAnswerReason(t: string, correctNV: string, correctLabel: string): string | null {
  const markers: RegExp[] = [
    // "the answer is/=/: X", "answer would be X"
    new RegExp(`answer\\s+(?:is|=|:|would\\s+be|will\\s+be|equals?)\\s+(?:the\\s+\\w+\\s+)?(${VALUE})`, 'g'),
    // "X is (the) (correct/right/final) answer"
    new RegExp(`(?:^|[^\\w])(${VALUE})\\s+is\\s+(?:the\\s+)?(?:correct\\s+|right\\s+|final\\s+)?answer\\b`, 'g'),
    // "so/therefore X." near the very end (optionally "so x = X")
    new RegExp(
      `(?:^|[^\\w])(?:so|therefore|thus|hence)\\s+(?:it'?s\\s+|it\\s+is\\s+|the\\s+answer\\s+is\\s+|x\\s*=\\s*)?(${VALUE})\\s*[.!?]*\\s*$`,
      'g',
    ),
  ];
  for (const re of markers) {
    for (const m of t.matchAll(re)) {
      const v = normValue(m[1]);
      if (v && v !== correctNV) {
        return `asserts the answer is "${m[1].trim()}" but the correct answer is "${correctLabel}"`;
      }
    }
  }
  return null;
}

/** (b) NO-ENDORSEMENT — must not affirm the student's wrong pick as correct. */
function endorsementReason(t: string, userPickLabel: string): string | null {
  const L = labelSource(userPickLabel);
  if (!L) return null;
  const patterns: RegExp[] = [
    // "yes / correct / you're right, (it's) <pick>"
    new RegExp(
      `\\b(?:yes|yep|yeah|yup|correct|right|exactly|bingo)\\b[\\s,!.:;-]+(?:it'?s\\s+|its\\s+|that'?s\\s+|you\\s+(?:are\\s+)?(?:right|correct)\\b[\\s,!.:;-]*|the\\s+answer\\s+is\\s+)*${L}(?![\\w])`,
    ),
    // "<pick> is (indeed) correct/right" or "<pick> is the answer"
    new RegExp(`(?:^|[^\\w])${L}\\s+(?:is|are)\\s+(?:indeed\\s+|actually\\s+|absolutely\\s+|the\\s+)*(?:correct|right)(?![\\w])`),
    new RegExp(`(?:^|[^\\w])${L}\\s+is\\s+(?:the\\s+)?(?:correct\\s+|right\\s+)?answer(?![\\w])`),
  ];
  return patterns.some((re) => re.test(t))
    ? `endorses the student's wrong pick "${userPickLabel}"`
    : null;
}

/** (a, cont.) Any OTHER wrong option stated as the answer / endorsed correct. */
function wrongOptionReason(t: string, options: string[], correctNV: string): string | null {
  for (const opt of options) {
    const nv = normValue(opt);
    if (!nv || nv === correctNV) continue;
    const L = labelSource(opt);
    const patterns: RegExp[] = [
      new RegExp(
        `(?:^|[^\\w])(?:the\\s+)?(?:final\\s+|correct\\s+)?answer\\s+(?:is|=|:|would\\s+be|will\\s+be|equals?)\\s+(?:the\\s+\\w+\\s+)?${L}(?![\\w])`,
      ),
      new RegExp(
        `(?:^|[^\\w])${L}\\s+(?:is|are|=)\\s+(?:indeed\\s+|actually\\s+|the\\s+)*(?:correct|right|the\\s+(?:right|correct)\\s+answer|the\\s+answer)(?![\\w])`,
      ),
      new RegExp(`(?:^|[^\\w])(?:so|therefore|thus|hence)\\s+(?:it'?s\\s+|it\\s+is\\s+|the\\s+answer\\s+is\\s+)?${L}\\s*[.!?]*\\s*$`),
      // "x = <wrong option>" / "= <wrong option>": an equation result equal to a
      // distractor label (catches option-valued operands the allowed-number set
      // can't, e.g. solving x + 3 = 7 and writing "x = 3").
      new RegExp(`=\\s*${L}(?!\\d)`),
    ];
    if (patterns.some((re) => re.test(t))) return `states wrong option "${opt}" as the answer`;
  }
  return null;
}

// Result keywords: a number sitting right after one of these (allowing only a
// little filler) is treated as an asserted RESULT, not an incidental number.
const RESULT_NUMBER = new RegExp(
  '(?:=|\\b(?:is|are|equals?|gives?|makes?|get|gets|got|it\'?s|its)\\b)' +
    "\\s*(?:(?:the|a|an|now|just|then|to|be|it|it'?s|its|that'?s|you|us|about|around|approximately|roughly|exactly|simply|only)\\s+){0,2}" +
    '(\\d+(?:\\.\\d+)?)',
  'g',
);

/**
 * (c) NUMBER CONSISTENCY (conservative) — a number asserted as a RESULT
 * (adjacent to =, is, equals, gives, makes, get, it's …) must come from the
 * allowed set. Incidental/analogy numbers far from result keywords are ignored.
 */
function numberConsistencyReason(t: string, allowed: Set<number>): string | null {
  for (const m of t.matchAll(RESULT_NUMBER)) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && !allowed.has(n)) {
      return `states result ${m[1]} which is not consistent with the problem`;
    }
  }
  return null;
}

// --- public API ------------------------------------------------------------

/**
 * Validate AI guidance against the known-correct sources in `request`.
 * Returns `{ ok: true }` when safe to reveal, or `{ ok: false, reason }` so the
 * caller can log why and fall back to the authored tip.
 */
export function verifyExplanation(text: string, request: HelpRequest): VerifyResult {
  const raw = text ?? '';

  const fmt = formatReason(raw);
  if (fmt) return { ok: false, reason: fmt };

  const t = normText(raw);
  if (!t) return { ok: false, reason: 'empty explanation' };

  const correctNV = normValue(request.correctLabel);

  const finalAns = finalAnswerReason(t, correctNV, request.correctLabel);
  if (finalAns) return { ok: false, reason: finalAns };

  const endorse = endorsementReason(t, request.userPickLabel);
  if (endorse) return { ok: false, reason: endorse };

  const wrongOpt = wrongOptionReason(t, request.options, correctNV);
  if (wrongOpt) return { ok: false, reason: wrongOpt };

  const numberIssue = numberConsistencyReason(t, allowedNumberSet(request));
  if (numberIssue) return { ok: false, reason: numberIssue };

  return { ok: true };
}
