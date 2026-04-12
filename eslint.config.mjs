import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  react: true,
  ignores: ['src/components/ui/**.tsx', 'src/routeTree.gen.ts', '.output/**', 'prisma/generated/**'],
  typescript: {
    tsconfigPath: 'tsconfig.json',
  },
  lessOpinionated: true,
  rules: {
    'ts/no-misused-promises': 'off',
    'ts/no-floating-promises': 'off',
    'node/prefer-global/process': 'off',
    'node/prefer-global/buffer': 'off',
  },
}, {
  files: ['src/components/pending/**.tsx'],
  rules: {
    'react/no-array-index-key': 'off',
  },
}, {
  files: ['src/components/ui/**.tsx', 'src/routes/**/*.tsx'],
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
