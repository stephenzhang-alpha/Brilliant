import { describe, it, expect } from 'vitest';
import {
  authErrorMessage,
  friendlyAuthError,
  getAuthErrorCode,
  GENERIC_CREDENTIAL_MESSAGE,
  DEFAULT_AUTH_MESSAGE,
} from '../authErrors';

describe('authErrorMessage', () => {
  it('returns ONE identical generic message for every enumeration-sensitive code', () => {
    // wrong-password / user-not-found / invalid-credential must be indistinguishable
    // so an attacker can't probe which emails are registered.
    expect(authErrorMessage('auth/wrong-password')).toBe(GENERIC_CREDENTIAL_MESSAGE);
    expect(authErrorMessage('auth/user-not-found')).toBe(GENERIC_CREDENTIAL_MESSAGE);
    expect(authErrorMessage('auth/invalid-credential')).toBe(GENERIC_CREDENTIAL_MESSAGE);

    const all = new Set([
      authErrorMessage('auth/wrong-password'),
      authErrorMessage('auth/user-not-found'),
      authErrorMessage('auth/invalid-credential'),
    ]);
    expect(all.size).toBe(1);
  });

  it('maps other known codes to distinct, non-generic friendly messages', () => {
    const emailInUse = authErrorMessage('auth/email-already-in-use');
    const invalidEmail = authErrorMessage('auth/invalid-email');
    const weak = authErrorMessage('auth/weak-password');

    expect(emailInUse).not.toBe(DEFAULT_AUTH_MESSAGE);
    expect(emailInUse).not.toBe(GENERIC_CREDENTIAL_MESSAGE);
    expect(invalidEmail).not.toBe(GENERIC_CREDENTIAL_MESSAGE);
    expect(weak).not.toBe(GENERIC_CREDENTIAL_MESSAGE);
    expect(new Set([emailInUse, invalidEmail, weak]).size).toBe(3);
  });

  it('falls back to the default message for unknown, empty, or missing codes', () => {
    expect(authErrorMessage('auth/some-future-code')).toBe(DEFAULT_AUTH_MESSAGE);
    expect(authErrorMessage('')).toBe(DEFAULT_AUTH_MESSAGE);
    expect(authErrorMessage(undefined)).toBe(DEFAULT_AUTH_MESSAGE);
    expect(authErrorMessage(null)).toBe(DEFAULT_AUTH_MESSAGE);
  });
});

describe('getAuthErrorCode', () => {
  it('extracts a string code from a Firebase-style error', () => {
    expect(getAuthErrorCode({ code: 'auth/wrong-password' })).toBe('auth/wrong-password');
  });

  it('returns undefined when no usable code is present', () => {
    expect(getAuthErrorCode(new Error('boom'))).toBeUndefined();
    expect(getAuthErrorCode({ code: 42 })).toBeUndefined();
    expect(getAuthErrorCode(null)).toBeUndefined();
    expect(getAuthErrorCode(undefined)).toBeUndefined();
    expect(getAuthErrorCode('auth/wrong-password')).toBeUndefined();
  });
});

describe('friendlyAuthError', () => {
  it('routes a Firebase error object through the mapper', () => {
    expect(friendlyAuthError({ code: 'auth/user-not-found' })).toBe(GENERIC_CREDENTIAL_MESSAGE);
    expect(friendlyAuthError({ code: 'auth/too-many-requests' })).not.toBe(DEFAULT_AUTH_MESSAGE);
  });

  it('never leaks a raw message and defaults safely for non-Firebase errors', () => {
    expect(friendlyAuthError(new Error('super secret internal detail'))).toBe(DEFAULT_AUTH_MESSAGE);
    expect(friendlyAuthError(undefined)).toBe(DEFAULT_AUTH_MESSAGE);
  });
});
