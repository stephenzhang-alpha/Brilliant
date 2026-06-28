import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useOverallStore, rankInfo } from '../stores/overallStore';
import { useGroupStore } from '../stores/groupStore';
import { normalizeGroupCode, GROUP_CODE_LENGTH } from '../lib/groupCode';
import { isFirebaseConfigured } from '../firebase/config';

function medal(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
}

export function LeaderboardPage() {
  const user = useAuthStore((s) => s.user);
  const overall = useOverallStore((s) => s.overall);
  const info = rankInfo(overall);
  const {
    ready,
    group,
    members,
    membersLoading,
    displayName,
    busy,
    error,
    createGroup,
    joinGroup,
    leaveGroup,
    setDisplayName,
    clearError,
  } = useGroupStore();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(displayName);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const saveName = async () => {
    await setDisplayName(nameDraft);
    setEditingName(false);
  };

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    await createGroup(groupNameInput);
    setGroupNameInput('');
  };

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    await joinGroup(codeInput);
    setCodeInput('');
  };

  const copyCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — the code is shown on screen to copy manually
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Group Leaderboard</h1>
        <Link
          to="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          ← Play
        </Link>
      </div>

      {/* The player's overall quest standing — the score groups are ranked by. */}
      <div className="mb-4 rounded-xl border border-black/10 bg-surface px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
            style={{
              background: `${info.rank.color}22`,
              boxShadow: `inset 0 0 0 2px ${info.rank.color}55`,
            }}
          >
            {info.rank.icon}
          </span>
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-text-muted">
              Your total score
            </p>
            <p
              className="font-display text-lg font-extrabold leading-tight"
              style={{ color: info.rank.color }}
            >
              {info.rank.name}
            </p>
          </div>
          <span className="ml-auto font-display text-2xl font-extrabold tabular-nums text-primary">
            {overall.toLocaleString()}
          </span>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          Groups are ranked by total score — the sum of your best runs across the quest.
        </p>
      </div>

      {/* Handle editor */}
      <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-surface px-5 py-4 shadow-sm">
        <span className="shrink-0 text-text-muted">Your handle</span>
        {editingName ? (
          <div className="flex min-w-0 items-center gap-2">
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={20}
              autoFocus
              aria-label="Your display handle"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveName();
                if (e.key === 'Escape') setEditingName(false);
              }}
              className="w-40 rounded-full border border-black/10 bg-surface-light px-4 py-1.5 text-text focus:border-primary-light focus:outline-none"
              placeholder="Your handle"
            />
            <button
              onClick={saveName}
              className="rounded-full bg-primary px-4 py-1.5 font-medium text-white hover:bg-primary-dark"
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setNameDraft(displayName);
              setEditingName(true);
            }}
            className="font-semibold transition-colors hover:text-primary-light"
            title="Change your leaderboard handle"
          >
            {displayName} <span className="ml-0.5 text-text-muted">✎</span>
          </button>
        )}
      </div>

      {!isFirebaseConfigured && (
        <p className="rounded-lg border border-black/10 bg-surface px-4 py-3 text-sm text-text-muted">
          Group leaderboards need Firebase configured. Your progress is saved locally on this device.
        </p>
      )}

      {isFirebaseConfigured && !user && (
        <div className="rounded-xl border border-primary/30 bg-primary/10 p-5 text-center">
          <p className="text-text">Sign in to create or join a group leaderboard.</p>
          <Link
            to="/login"
            className="mt-3 inline-block rounded-lg bg-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Sign in
          </Link>
        </div>
      )}

      {isFirebaseConfigured && user && !ready && (
        <div className="flex justify-center py-10">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary-light border-t-transparent" />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
        >
          <span>{error}</span>
          <button onClick={clearError} type="button" className="shrink-0 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* In a group → show the roster (live leaderboard). */}
      {isFirebaseConfigured && user && ready && group && (
        <>
          <div className="mb-4 rounded-xl border border-primary/20 bg-surface px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-text-muted">
                  Your group
                </p>
                <p className="truncate font-display text-xl font-extrabold text-text">
                  {group.name}
                </p>
              </div>
              <button
                onClick={() => void leaveGroup()}
                disabled={busy}
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted underline transition-colors hover:text-error disabled:opacity-50"
              >
                Leave group
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-text-muted">Invite code</span>
              <code className="rounded-md bg-primary/10 px-2.5 py-1 font-mono text-base font-bold tracking-[0.2em] text-primary">
                {group.code}
              </code>
              <button
                onClick={copyCode}
                type="button"
                className="rounded-md border border-black/10 px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-primary-light hover:text-primary"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-text-muted">
              Share this code so others can join and compete with you.
            </p>
          </div>

          <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-text-muted">
            🏆 {group.name} — standings
          </h2>

          {membersLoading && members.length === 0 ? (
            <div className="flex justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary-light border-t-transparent" />
            </div>
          ) : (
            <ol className="space-y-1.5">
              {members.map((row, i) => {
                const rank = i + 1;
                const isMe = row.uid === user.uid;
                return (
                  <li
                    key={row.uid}
                    className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
                      isMe ? 'border-primary/40 bg-primary/15' : 'border-black/10 bg-surface'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="w-6 text-right tabular-nums text-text-muted">{rank}</span>
                      <span className="truncate font-medium">
                        {row.name} {medal(rank)}
                        {isMe && <span className="ml-1 text-xs text-primary-light">(you)</span>}
                      </span>
                    </span>
                    <span className="font-bold tabular-nums text-primary-light">
                      {row.score.toLocaleString()}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}

      {/* Not in a group → create or join. */}
      {isFirebaseConfigured && user && ready && !group && (
        <div className="space-y-4">
          <form onSubmit={onCreate} className="rounded-xl border border-black/10 bg-surface p-5 shadow-sm">
            <h2 className="font-display text-lg font-extrabold text-text">Create a group</h2>
            <p className="mt-0.5 mb-3 text-sm text-text-muted">
              Start a private leaderboard and get a code to share with friends or your class.
            </p>
            <div className="flex gap-2">
              <input
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                maxLength={40}
                aria-label="Group name"
                placeholder="e.g. Period 3 Algebra"
                className="min-w-0 flex-1 rounded-lg border border-black/10 bg-surface-light px-4 py-2.5 text-text focus:border-primary-light focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !groupNameInput.trim()}
                className="btn-pop shrink-0 rounded-lg bg-primary px-5 py-2.5 font-display font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>

          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
            <span className="h-px flex-1 bg-black/10" />
            or
            <span className="h-px flex-1 bg-black/10" />
          </div>

          <form onSubmit={onJoin} className="rounded-xl border border-black/10 bg-surface p-5 shadow-sm">
            <h2 className="font-display text-lg font-extrabold text-text">Join a group</h2>
            <p className="mt-0.5 mb-3 text-sm text-text-muted">
              Got a code? Enter it to join your group&apos;s leaderboard.
            </p>
            <div className="flex gap-2">
              <input
                value={codeInput}
                onChange={(e) => setCodeInput(normalizeGroupCode(e.target.value))}
                maxLength={GROUP_CODE_LENGTH}
                aria-label="Group invite code"
                placeholder="ABC123"
                autoCapitalize="characters"
                className="w-40 rounded-lg border border-black/10 bg-surface-light px-4 py-2.5 font-mono text-lg font-bold uppercase tracking-[0.3em] text-text focus:border-primary-light focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || codeInput.length < GROUP_CODE_LENGTH}
                className="btn-pop shrink-0 rounded-lg bg-primary px-5 py-2.5 font-display font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
              >
                {busy ? 'Joining…' : 'Join'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
