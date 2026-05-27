import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // The Three.js GameEngine is intentionally non-reactive; reading
      // engineRef.current during render is the integration boundary.
      'react-hooks/refs': 'off',
      // Time-based animation overlays read Date.now() in render by design;
      // event handlers may legitimately call Math.random().
      'react-hooks/purity': 'off',
      // Files like FloatingText.tsx export a component plus its companion hook.
      'react-refresh/only-export-components': 'off',
      // Init/error paths in the engine-bootstrap effect legitimately need setState
      // (auto-join on mount, WebGL fallback). Cascading-render risk is bounded.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
)
