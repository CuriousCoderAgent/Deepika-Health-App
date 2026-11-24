import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * `npm run lint`. Next 16 removed `next lint` and no longer lints during
 * `next build`, so this is all of it: Next's own rule sets, and the few
 * decisions below. Each says why, so a finding can be argued with rather
 * than switched off in passing.
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Generated, never edited: what `npm run test:logic` compiles to, and
      // the website's build.
      ".test-build/**",
      "website/dist/**",
      "website/node_modules/**",
    ],
  },
  {
    rules: {
      // A name that starts with _ is unused on purpose, and so is a key taken
      // out of an object only to keep the rest: `const { id: _, ...rest } = x`.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // Each `any` here sits where a value crosses a line TypeScript cannot
      // see across: a database row, a request body, a polymorphic `as` prop.
      // Typing them is worth doing as its own change; `npm run build` already
      // type-checks everything else strictly.
      "@typescript-eslint/no-explicit-any": "off",

      // Most screens here read what only the browser knows — the address,
      // localStorage, the clock, the element a sheet opens into — in an effect
      // after the first render, and set state from it. That is what keeps the
      // server's render and the browser's first render the same. The rest
      // reset or follow a value when it changes, such as closing the menu on
      // navigation. Both are correct; the rule is aimed at the React Compiler,
      // which this app does not use.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default eslintConfig;
