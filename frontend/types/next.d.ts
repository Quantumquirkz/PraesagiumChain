/**
 * Minimal Next.js type declarations when node_modules/next is not resolved.
 */
declare module "next" {
  export type Metadata = Record<string, unknown>;
}

declare module "next/font/google" {
  interface FontOptions {
    subsets?: string[];
    weight?: string | string[];
    variable?: string;
    display?: string;
  }
  export function Syne(options: FontOptions): { variable: string; className: string };
  export function Space_Mono(options: FontOptions): { variable: string; className: string };
}
