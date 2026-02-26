/**
 * Minimal React type declarations when node_modules/@types/react is not resolved.
 */
declare module "react" {
  type ReactNode = unknown;
  namespace React {
    type ReactNode = unknown;
  }
  export type { ReactNode };
  export default React;
}
