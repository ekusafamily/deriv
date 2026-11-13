import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ShieldCheck, AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { connectAccount } = useStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying Deriv authorization & exchanging PKCE credentials...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthExchange = async () => {
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (error) {
        setStatus('error');
        setMessage('Deriv Authorization Rejected');
        setErrorDetails(errorDescription || error);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('Missing Authorization Code');
        setErrorDetails('No authorization code was returned from Deriv.');
        return;
      }

      // Step 3 & 4: Verify state and extract PKCE verifier
      const storedState = sessionStorage.getItem('oauth_state');
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      const redirectUri = sessionStorage.getItem('oauth_redirect_uri') || window.location.origin + '/callback';

      if (storedState && state && storedState !== state) {
        setStatus('error');
        setMessage('Security Verification Failed (CSRF State Mismatch)');
        setErrorDetails('The state parameter returned by Deriv does not match your session.');
        return;
      }

      if (!codeVerifier) {
        setStatus('error');
        setMessage('PKCE Session Expired');
        setErrorDetails('Could not find original code_verifier in browser session. Please try logging in again.');
        return;
      }

      try {
        setMessage('Exchanging authorization code for Deriv access token...');
        const resp = await fetch('/api/auth/deriv/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            codeVerifier,
            redirectUri
          })
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data.error || 'Failed to exchange authorization code for access token');
        }

        // Clean up PKCE storage
        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('oauth_state');
        sessionStorage.removeItem('oauth_redirect_uri');

        const accountData = data.account;
        connectAccount({
          accountId: accountData.accountId,
          token: accountData.token,
          balance: Number(accountData.balance ?? 0),
          currency: accountData.currency || 'USD',
          isVirtual: Boolean(accountData.isVirtual)
        });

        setStatus('success');
        setMessage(`Successfully authenticated as ${accountData.accountId} (${accountData.isVirtual ? 'Demo' : 'Real'})!`);

        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } catch (err: any) {
        setStatus('error');
        setMessage('Token Exchange Failed');
        setErrorDetails(err.message || 'An unexpected error occurred during token exchange.');
      }
    };

    handleAuthExchange();
  }, [searchParams, navigate, connectAccount]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 max-w-md w-full text-center space-y-6 shadow-2xl bg-[#0c1222]/90">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center animate-pulse">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Authenticating with Deriv</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">{message}</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">Connected Successfully</h2>
              <p className="text-xs text-emerald-400 mt-2 font-medium">{message}</p>
              <p className="text-[11px] text-slate-500 mt-1">Redirecting to Dashboard...</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">{message}</h2>
              {errorDetails && (
                <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs text-left font-mono break-all">
                  {errorDetails}
                </div>
              )}
            </div>
            <div className="pt-2 flex gap-3">
              <button
                onClick={() => navigate('/settings')}
                className="flex-1 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Go to Settings
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

