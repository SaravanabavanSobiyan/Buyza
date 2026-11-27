import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const providerConfig = {
  google: {
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    scope: "openid email profile",
  },
  facebook: {
    authorizationUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    userInfoUrl: "https://graph.facebook.com/me?fields=id,name,email,picture.type(large)",
    scope: "email,public_profile",
  },
};

const getCredentials = (provider) => {
  const credentials = env.oauth[provider];
  if (!credentials?.clientId || !credentials?.clientSecret) {
    throw new ApiError(503, `${provider} sign in is not configured yet.`);
  }
  return credentials;
};

export const getOAuthRedirectUri = (provider) =>
  `${env.apiUrl}/auth/${provider}/callback`;

export function getAuthorizationUrl(provider, state) {
  const config = providerConfig[provider];
  if (!config) throw new ApiError(400, "Unsupported sign-in provider");
  const { clientId } = getCredentials(provider);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getOAuthRedirectUri(provider),
    response_type: "code",
    scope: config.scope,
    state,
  });
  return `${config.authorizationUrl}?${params}`;
}

export async function getOAuthProfile(provider, code) {
  const config = providerConfig[provider];
  if (!config) throw new ApiError(400, "Unsupported sign-in provider");
  const credentials = getCredentials(provider);
  const tokenParams = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    redirect_uri: getOAuthRedirectUri(provider),
    grant_type: "authorization_code",
  });
  const tokenResponse = provider === "google"
    ? await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: tokenParams,
      })
    : await fetch(`${config.tokenUrl}?${tokenParams}`);
  if (!tokenResponse.ok) throw new ApiError(401, `Could not connect to ${provider}.`);
  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenData.access_token) {
    console.error(`${provider} OAuth token exchange failed:`, tokenData.error_description || tokenData.error || "missing access token");
    throw new ApiError(401, `Could not connect to ${provider}.`);
  }

  const profileResponse = await fetch(
    config.userInfoUrl,
    { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
  );
  if (!profileResponse.ok) {
    console.error(`${provider} OAuth profile request failed:`, profileResponse.status);
    throw new ApiError(401, `Could not read your ${provider} profile.`);
  }
  const profile = await profileResponse.json();
  const email = profile.email?.trim().toLowerCase();
  if (!email) throw new ApiError(422, `Your ${provider} account did not provide an email address.`);

  return {
    provider,
    providerId: String(profile.id || profile.sub),
    name: profile.name || profile.given_name || email.split("@")[0],
    email,
    avatarUrl: profile.picture?.data?.url || profile.picture,
  };
}
