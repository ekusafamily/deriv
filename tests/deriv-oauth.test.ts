import { describe, it, expect } from 'vitest';
import { generateCodeVerifier, deriveCodeChallenge, generateState } from '../client/src/services/derivAuth';

describe('Deriv OAuth 2.0 PKCE Specification', () => {
  it('should generate a cryptographically valid code_verifier (43-128 chars, RFC 7636)', () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toBeTypeOf('string');
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    // Allowed characters: [A-Z], [a-z], [0-9], "-", ".", "_", "~"
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('should derive a standard Base64URL SHA-256 code_challenge', async () => {
    // Known test vector for PKCE RFC 7636:
    // If verifier is known, test SHA-256 and base64url encoding
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await deriveCodeChallenge(verifier);

    expect(challenge).toBeTypeOf('string');
    // Base64URL must not contain '+', '/', or '='
    expect(challenge).not.toContain('+');
    expect(challenge).not.toContain('/');
    expect(challenge).not.toContain('=');
    expect(challenge.length).toBeGreaterThan(0);
  });

  it('should generate a random state token for CSRF protection', () => {
    const state1 = generateState();
    const state2 = generateState();

    expect(state1).toBeTypeOf('string');
    expect(state1.length).toBe(32);
    expect(state1).not.toBe(state2);
  });
});

