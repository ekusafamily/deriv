// Deriv OAuth 2.0 PKCE Authentication Service
// Implements RFC 7636 (PKCE) and Deriv OAuth 2.0 Authorization Code flow

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  authUrl: string;
  scopes: string[];
}

export function generateCodeVerifier(): string {
  const array = crypto.getRandomValues(new Uint8Array(64));
  return Array.from(array)
    .map((v) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
    .join('');
}

export async function deriveCodeChallenge(codeVerifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateState(): string {
  const array = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function fetchOAuthConfig(): Promise<OAuthConfig> {
  const resp = await fetch('/api/auth/deriv/config');
  if (!resp.ok) {
    throw new Error('Failed to fetch Deriv OAuth configuration from server');
  }
  return resp.json();
}

export async function initiateDerivOAuth(options?: {
  prompt?: 'registration';
  redirectUri?: string;
  scope?: string;
}): Promise<void> {
  const config = await fetchOAuthConfig();
  if (!config.clientId) {
    throw new Error('Deriv OAuth client_id is not configured on the server (DERIV_CLIENT_ID).');
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await deriveCodeChallenge(codeVerifier);
  const state = generateState();
  const redirectUri = options?.redirectUri || config.redirectUri || `${window.location.origin}/callback`;
  const scope = options?.scope || config.scopes?.join(' ') || 'trade account_manage';

  // Store PKCE verifier, state, and redirectUri in sessionStorage
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oauth_redirect_uri', redirectUri);

  const authUrl = new URL(config.authUrl || 'https://auth.deriv.com/oauth2/auth');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  if (options?.prompt === 'registration') {
    authUrl.searchParams.set('prompt', 'registration');
  }

  // Redirect user to Deriv OAuth authorization endpoint
  window.location.href = authUrl.toString();
}

