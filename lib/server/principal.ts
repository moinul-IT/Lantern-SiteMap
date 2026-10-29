import type { NextRequest } from "next/server";

/**
 * Who is calling, according to the platform in front of this server.
 *
 * App Service "Easy Auth" terminates sign-in at the edge and passes the result
 * down in `x-ms-client-principal`: base64 JSON describing the signed-in user.
 * The platform strips any inbound copy of that header before the request
 * reaches us, which is the only reason it can be trusted — the app itself
 * verifies no token. That holds only while the server is unreachable except
 * through App Service, so the deployment notes say to keep it that way.
 *
 * Two header shapes exist and this reads both:
 *
 *   - App Service / Container Apps send a ClaimsPrincipal:
 *     `{ auth_typ, name_typ, role_typ, claims: [{ typ, val }] }`
 *   - Static Web Apps sends a flat object:
 *     `{ userId, userDetails, identityProvider, userRoles }`
 *
 * The flat form is still accepted because the earlier Static Web Apps build
 * used it, and because Azure's own local emulators emit it.
 */

/** The role allowed to change content. Granted per user in Entra ID. */
export const CONTENT_MANAGER_ROLE = "contentmanager";

/** What Entra ID calls app-role claims, plus the long-form equivalent. */
const ROLE_CLAIM_TYPES = [
  "roles",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
];

const NAME_CLAIM_TYPES = [
  "preferred_username",
  "name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];

const ID_CLAIM_TYPES = [
  "http://schemas.microsoft.com/identity/claims/objectidentifier",
  "oid",
  "sub",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
];

export type Principal = {
  userId: string | null;
  userDetails: string | null;
  identityProvider: string | null;
  userRoles: string[];
};

type Claim = { typ?: unknown; val?: unknown };

function claimValues(claims: Claim[], types: string[]) {
  return claims
    .filter((c) => typeof c.typ === "string" && types.includes(c.typ))
    .map((c) => c.val)
    .filter((v): v is string => typeof v === "string");
}

function fromClaimsPrincipal(parsed: Record<string, unknown>): Principal {
  const claims = Array.isArray(parsed.claims) ? (parsed.claims as Claim[]) : [];

  /*
   * `role_typ` names the claim type this provider puts roles in. Honouring it
   * rather than only matching the two well-known names means a provider that
   * uses its own URI still resolves roles instead of silently granting none —
   * which would read as "signed in but not a content manager".
   */
  const roleTypes = [...ROLE_CLAIM_TYPES];
  if (typeof parsed.role_typ === "string" && !roleTypes.includes(parsed.role_typ)) {
    roleTypes.push(parsed.role_typ);
  }

  const nameTypes = [...NAME_CLAIM_TYPES];
  if (typeof parsed.name_typ === "string" && !nameTypes.includes(parsed.name_typ)) {
    nameTypes.unshift(parsed.name_typ);
  }

  return {
    userId: claimValues(claims, ID_CLAIM_TYPES)[0] ?? null,
    userDetails: claimValues(claims, nameTypes)[0] ?? null,
    identityProvider: typeof parsed.auth_typ === "string" ? parsed.auth_typ : null,
    userRoles: claimValues(claims, roleTypes),
  };
}

function fromFlatPrincipal(parsed: Record<string, unknown>): Principal {
  return {
    userId: typeof parsed.userId === "string" ? parsed.userId : null,
    userDetails: typeof parsed.userDetails === "string" ? parsed.userDetails : null,
    identityProvider:
      typeof parsed.identityProvider === "string" ? parsed.identityProvider : null,
    userRoles: Array.isArray(parsed.userRoles)
      ? parsed.userRoles.filter((r): r is string => typeof r === "string")
      : [],
  };
}

type HeaderSource =
  | NextRequest
  | Request
  | { get(name: string): string | null }
  | Headers;

function headerValue(source: HeaderSource, name: string): string | null {
  /*
   * Checked in this order deliberately. A `Request` carries its headers on
   * `.headers`, but `headers()` from next/headers returns a header bag that
   * both reads directly and happens to expose an internal `headers` property
   * that is not one — so testing for `.headers` first picks the wrong object
   * and blows up on `.get`.
   */
  if (typeof (source as { get?: unknown }).get === "function") {
    return (source as { get(name: string): string | null }).get(name);
  }
  const bag = (source as { headers?: { get?: unknown } }).headers;
  if (bag && typeof bag.get === "function") {
    return (bag as { get(name: string): string | null }).get(name);
  }
  return null;
}

let warnedAboutUntrustedHeader = false;

/**
 * Whether `x-ms-client-principal` can be believed.
 *
 * It is an ordinary request header. What makes it trustworthy is the platform
 * in front of this server stripping any inbound copy and writing its own — so
 * if that platform is not there, the header is just something a caller typed,
 * and believing it would hand the content manager role to anyone who asked.
 *
 * App Service sets WEBSITE_AUTH_ENABLED when authentication is configured.
 * Anything else fronting this server (Container Apps, an authenticating
 * reverse proxy) says so with TRUST_AUTH_HEADER=1.
 *
 * Outside production the header is trusted so the editor can be run locally.
 */
function headerIsTrustworthy() {
  if (process.env.NODE_ENV !== "production") return true;
  if (process.env.TRUST_AUTH_HEADER === "1") return true;
  if (/^(1|true)$/i.test(process.env.WEBSITE_AUTH_ENABLED ?? "")) return true;

  if (!warnedAboutUntrustedHeader) {
    warnedAboutUntrustedHeader = true;
    console.error(
      "[auth] Ignoring x-ms-client-principal: nothing in front of this server is " +
        "known to be authenticating requests, so the header could come from anyone. " +
        "Nobody can sign in or save until App Service authentication is enabled " +
        "(WEBSITE_AUTH_ENABLED), or TRUST_AUTH_HEADER=1 is set to vouch for another proxy.",
    );
  }
  return false;
}

export function readPrincipal(source: HeaderSource): Principal | null {
  if (!headerIsTrustworthy()) return null;

  const header = headerValue(source, "x-ms-client-principal");
  if (!header) return null;

  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(header, "base64").toString("utf8"),
    );
    if (typeof parsed !== "object" || parsed === null) return null;

    const record = parsed as Record<string, unknown>;
    return Array.isArray(record.claims)
      ? fromClaimsPrincipal(record)
      : fromFlatPrincipal(record);
  } catch {
    // A malformed header means the caller is simply not authenticated. Raising
    // here would turn a stray proxy header into a 500 on the public map.
    return null;
  }
}

export function isContentManager(principal: Principal | null): boolean {
  return Boolean(principal?.userRoles.includes(CONTENT_MANAGER_ROLE));
}

/** Where App Service Easy Auth puts its sign-in and sign-out endpoints. */
export const LOGIN_PATH = "/.auth/login/aad";
export const LOGOUT_PATH = "/.auth/logout";

export function loginUrl(returnTo = "/manage") {
  return `${LOGIN_PATH}?post_login_redirect_uri=${encodeURIComponent(returnTo)}`;
}

export function logoutUrl(returnTo = "/") {
  return `${LOGOUT_PATH}?post_logout_redirect_uri=${encodeURIComponent(returnTo)}`;
}
