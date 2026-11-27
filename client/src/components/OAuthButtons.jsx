import { getOAuthUrl } from "../api/auth";

export default function OAuthButtons() {
  const startOAuth = (provider) => {
    window.location.assign(getOAuthUrl(provider));
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        <span>or continue with</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" className="buyza-oauth-button" onClick={() => startOAuth("google")}>
          <svg className="buyza-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.26Z" />
            <path fill="#34A853" d="M12 21.7c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.7Z" />
            <path fill="#FBBC05" d="M6.54 13.78a5.85 5.85 0 0 1 0-3.56V7.69H3.3a9.75 9.75 0 0 0 0 8.62l3.24-2.53Z" />
            <path fill="#EA4335" d="M12 6.19c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.28 14.63 2.3 12 2.3a9.74 9.74 0 0 0-8.7 5.39l3.24 2.53C7.31 7.91 9.46 6.19 12 6.19Z" />
          </svg>
          Google
        </button>
        <button type="button" className="buyza-oauth-button" onClick={() => startOAuth("facebook")}>
          <svg className="buyza-oauth-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.86v-8.4H7.08V12h3.04V9.36c0-3 1.79-4.66 4.53-4.66 1.31 0 2.68.23 2.68.23v2.95h-1.5c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.46h-2.79v8.4A12 12 0 0 0 24 12Z" />
          </svg>
          Facebook
        </button>
      </div>
    </div>
  );
}
