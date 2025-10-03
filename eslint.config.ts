import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import prettierConfig from 'eslint-config-prettier'
import pluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'

export default [
  { ignores: ['dist/', '.wxt/', 'node_modules/', '**/*.d.ts'] },

  js.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    languageOptions: { globals: globals.browser },
    settings: {
      react: { version: 'detect' },
      'better-tailwindcss': {
        entryPoint: 'src/assets/global.css',
      },
    },
  },

  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [...tseslint.configs.recommended],
    plugins: { '@typescript-eslint': tseslint.plugin },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        // If you opt into type-aware linting, uncomment:
        // project: './tsconfig.json',
        // projectService: true,
      },
    },
  },

  pluginReact.configs.flat.recommended,

  // Apply the Tailwind preset as its own entry (no duplicate "plugins" keys here)
  pluginBetterTailwindcss.configs.recommended,

  // Keep Prettier last
  prettierConfig,
]
