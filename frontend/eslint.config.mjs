import nextConfig from "eslint-config-next";

/** Relax React 19 compiler-style rules until components are refactored (Next 16 / eslint-plugin-react-hooks v7). */
const relaxedHooksRules = {
  "react-hooks/purity": "off",
  "react-hooks/set-state-in-effect": "off",
  "react-hooks/refs": "off",
};

const config = [
  ...nextConfig,
  {
    rules: relaxedHooksRules,
  },
];

export default config;
