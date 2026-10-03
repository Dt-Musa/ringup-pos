// Single source of truth for role-based access. Pure (no Node/DB imports) so it can be
// used from the proxy, server components, route handlers and client components.

export const ROLES = ["ADMIN", "MANAGER", "CASHIER"] as const;
export type Role = (typeof ROLES)[number];

const ALL: Role[] = ["ADMIN", "MANAGER", "CASHIER"];
const STAFF: Role[] = ["ADMIN", "MANAGER"];
const ADMIN: Role[] = ["ADMIN"];

export type NavItem = { label: string; href: string; roles: Role[] };

/** Sidebar entries; also the page-level access table. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", roles: ALL },
  { label: "POS", href: "/pos", roles: ALL },
  { label: "Products", href: "/products", roles: STAFF },
  { label: "Inventory", href: "/inventory", roles: STAFF },
  { label: "Sales", href: "/sales", roles: ALL },
  { label: "Reports", href: "/reports", roles: STAFF },
  { label: "Users", href: "/users", roles: ADMIN },
];

type ApiRule = { prefix: string; methods?: string[]; roles: Role[] };

/**
 * API rules – first match wins. Any /api/* path not listed requires only a valid session.
 * Mutating verbs on /api/products need MANAGER+; reading the catalogue is open to all
 * roles because the POS screen needs it.
 */
export const API_RULES: ApiRule[] = [
  { prefix: "/api/auth", roles: ALL }, // handled specially (public) in the proxy
  { prefix: "/api/me", roles: ALL },
  { prefix: "/api/users", roles: ADMIN },
  { prefix: "/api/reports", roles: STAFF },
  { prefix: "/api/inventory", roles: STAFF },
  { prefix: "/api/products", methods: ["POST", "PUT", "PATCH", "DELETE"], roles: STAFF },
  { prefix: "/api/products", roles: ALL },
  { prefix: "/api/sales", roles: ALL },
];

function matches(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/** Returns the required roles for a path, or null if the path is not access-controlled by role. */
export function requiredRoles(pathname: string, method = "GET"): Role[] | null {
  if (pathname.startsWith("/api/")) {
    const rule = API_RULES.find(
      (r) => matches(pathname, r.prefix) && (!r.methods || r.methods.includes(method.toUpperCase())),
    );
    return rule ? rule.roles : ALL; // unlisted API: any authenticated user
  }
  const item = NAV_ITEMS.find((n) => matches(pathname, n.href));
  return item ? item.roles : null;
}

export function canAccess(role: Role, pathname: string, method = "GET") {
  const roles = requiredRoles(pathname, method);
  return roles === null ? true : roles.includes(role);
}

export function navFor(role: Role) {
  return NAV_ITEMS.filter((n) => n.roles.includes(role));
}

export function hasRole(role: Role, allowed: Role[]) {
  return allowed.includes(role);
}
