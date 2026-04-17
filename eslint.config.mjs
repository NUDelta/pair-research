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
    'perfectionist/sort-imports': ['error', {
      groups: [
        'tanstack-server-only',

        'type-import',
        ['type-parent', 'type-sibling', 'type-index', 'type-internal'],

        'value-builtin',
        'value-external',
        'value-internal',
        ['value-parent', 'value-sibling', 'value-index'],

        'side-effect',
        'ts-equals-import',
        'unknown',
      ],
      customGroups: [
        {
          groupName: 'tanstack-server-only',
          selector: 'side-effect',
          elementNamePattern: '^@tanstack/react-start/server-only$',
        },
      ],
      newlinesBetween: 'ignore',
      newlinesInside: 'ignore',
      order: 'asc',
      type: 'natural',
      sortSideEffects: false,
    }],
  },
}, {
  files: ['src/components/pending/**/*.tsx'],
  rules: {
    'react/no-array-index-key': 'off',
  },
}, {
  files: ['src/components/ui/**/*.tsx', 'src/routes/**/*.tsx'],
  rules: {
    'react-refresh/only-export-components': 'off',
  },
}, {
  files: ['src/lib/prismaClient.ts'],
  rules: {
    'ts/no-unsafe-assignment': 'off',
    'ts/no-unsafe-call': 'off',
  },
}, {
  files: ['**/*.md', '**/*.mdx'],
  rules: {
    'perfectionist/sort-imports': 'off',
    'perfectionist/sort-named-imports': 'off',
    'perfectionist/sort-named-exports': 'off',
  },
})
