/**
 * Stand-in for the `server-only` package under vitest.
 *
 * The real module throws on import outside a React Server Component, which is
 * exactly its job in the app and exactly what makes a server module
 * untestable. Aliasing it here lets the pure parts of those modules — amounts,
 * signature checks, webhook reducers — be tested for what they compute,
 * without loosening the guard that protects the app itself.
 */
export {};
