import antfu from '@antfu/eslint-config'
import nextPlugin from '@next/eslint-plugin-next'

export default antfu({
  formatters: true,
  react: true,
  ignores: ['src/components/ui/**.tsx'],
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  plugins: {
    '@next/next': nextPlugin,
  },
  lessOpinionated: true,
  rules: {
    'ts/no-misused-promises': 'off',
    'ts/no-floating-promises': 'off',
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
  },
}, {
  files: ['src/app/**/loading.tsx'],
  rules: {
    'react/no-array-index-key': 'off',
  },
}, {
  files: ['src/components/ui/**.tsx'],
  rules: {
    'react-refresh/only-export-components': 'off',
  },
}, {
  files: ['src/lib/prismaClient.ts'],
  rules: {
    'ts/no-unsafe-assignment': 'off',
    'ts/no-unsafe-call': 'off',
  },
})
