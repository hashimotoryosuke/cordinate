// Access token is kept in memory only (AuthContext state) to prevent XSS token theft.
// Refresh token is stored in localStorage (longer-lived; used only to re-issue access tokens).
// This file exports the localStorage key as a named constant.
export const REFRESH_TOKEN_KEY = 'cordinate_refresh'
