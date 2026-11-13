[Getting Started](/docs/)

# Authentication

To unlock the complete functionality of Deriv APIs, you must authenticate and authorise your users. Deriv supports two approaches: **OAuth 2.0 apps** and **Personal Access Token (PAT) apps**.

## Authentication Methods

### OAuth 2.0 apps

OAuth 2.0 lets users grant your app access without sharing their password. Your app redirects the user to a Deriv sign-in and consent page. After approval, Deriv returns an authorization code which you exchange for an access token.

1

Redirect to Deriv

2

User Logs In

3

Code Returned

4

Exchange for Token

[Set up OAuth 2.0](/docs/intro/oauth/)

### PAT apps

With a PAT app, the user generates a Personal Access Token in Deriv and manually enters it into your application. The app stores the token and includes it in API requests as a bearer token.

1

Generate Token

2

Paste into App

3

App Uses Token

##### Token-based access and request headers

Both methods give your app tokens to make authenticated API calls. The key difference is how users sign in and onboard.

When authenticating with a Personal Access Token (PAT), the `Deriv-App-ID` header is required on REST requests; omitting it returns `401 "Deriv-App-ID header is required for PAT tokens"`. When authenticating with an OAuth 2.0 Bearer token, `Deriv-App-ID` is not required because the token already identifies your application.

## Why Authentication Matters

Authentication improves security by keeping user passwords out of third-party apps. Tokens limit access based on scopes and can be revoked independently if needed.

OAuth 2.0 provides a standard sign-in flow and access tokens that expire, which improves security and user experience. PATs provide a simpler authentication option when manual token entry is acceptable.

## OAuth 2.0 app vs PAT app

| Aspect | OAuth 2.0 app | PAT app |
| --- | --- | --- |
| Best fit | Web-based applications | Desktop/native and non-web contexts |
| How onboarding works | User redirected to Deriv OAuth 2.0 sign-in; after approval, redirected back with an authorization code. | User generates a PAT in Deriv and manually pastes it into the app. |
| Redirect URLs | Required for completing the flow. | Not used. |
| User experience | Seamless web sign-in with consent. | Manual token entry — simple but less automated. |
| Use case examples | Web dashboards, browser apps. | Desktop tools, CLI apps, native clients. |
| Security notes | Issues access tokens that expire and minimises long-term credential sharing. | PATs act like scoped API credentials and can be revoked independently. |
| Deriv-App-ID header | Not required — the OAuth access token already identifies the client application. | Required on REST requests. Omitting it returns 401 "Deriv-App-ID header is required for PAT tokens". |

## When to choose which

1. **Choose OAuth 2.0 app** when your product can handle browser redirects and you need a standard delegated flow with user authorisation.
2. **Choose PAT app** when browser redirects are not practical and manual token entry is acceptable, such as in desktop or native environments.