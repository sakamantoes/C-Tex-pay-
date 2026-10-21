/**
 * Prevent browser/proxy caching for authenticated API responses.
 *
 * Authenticated financial data must never be served from cache — a
 * stale balance, stale transaction list, or stale settlement report
 * would show a super admin outdated numbers and could lead to
 * incorrect operational decisions.
 *
 * This middleware sets:
 *   Cache-Control: no-store, no-cache, must-revalidate, private
 *   Pragma: no-cache
 *   Expires: 0
 *   Vary: Authorization
 *
 * 'private' is important — some CDNs may strip 'private' and cache
 * shared content. Combined with 'Vary: Authorization', this ensures
 * each user gets their own fresh response.
 */
export function noCache(req, res, next) {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Vary", "Authorization");
  next();
}