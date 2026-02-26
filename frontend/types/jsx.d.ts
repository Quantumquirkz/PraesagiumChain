/**
 * Fallback JSX namespace when @types/react is not resolved (e.g. wrong node_modules path).
 * Ensures JSX.IntrinsicElements exists so JSX elements type-check.
 */
type IntrinsicElementProps = Record<string, unknown>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      html: IntrinsicElementProps;
      body: IntrinsicElementProps;
      div: IntrinsicElementProps;
      main: IntrinsicElementProps;
      span: IntrinsicElementProps;
      a: IntrinsicElementProps;
      button: IntrinsicElementProps;
      p: IntrinsicElementProps;
      section: IntrinsicElementProps;
      header: IntrinsicElementProps;
      footer: IntrinsicElementProps;
      nav: IntrinsicElementProps;
      [elementName: string]: IntrinsicElementProps;
    }
  }
}

export {};
