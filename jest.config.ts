import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  displayName: 'spacenexus',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],
  // Agent worktrees under .claude/ contain nested package.json copies that
  // break jest-haste-map with naming collisions.
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/'],
  collectCoverageFrom: [
    'src/lib/**/*.ts',
    '!src/lib/db.ts',
    '!src/**/*.d.ts',
  ],
};

// sanitize-html >= 2.17.7 depends on ESM-only htmlparser2@12 (plus its
// domhandler/domutils/entities/dom-serializer/domelementtype family). Jest
// cannot load those untransformed, and next/jest's default pattern ignores
// all of node_modules, so rewrite it: ignore node_modules EXCEPT that family
// (and the transpilePackages next/jest already allows). The `(?!.*node_modules)`
// guard makes the check apply to the innermost node_modules segment, so a
// nested `sanitize-html/node_modules/htmlparser2` is still transformed.
const JEST_TRANSPILED_NODE_MODULES = [
  'htmlparser2',
  'domhandler',
  'domutils',
  'entities',
  'dom-serializer',
  'domelementtype',
  'three',
  '@react-three',
];

export default async (): Promise<Config> => {
  const resolved = await createJestConfig(config)();
  return {
    ...resolved,
    transformIgnorePatterns: [
      `/node_modules/(?!.*node_modules)(?!(?:${JEST_TRANSPILED_NODE_MODULES.join('|')})/)`,
      ...(resolved.transformIgnorePatterns ?? []).filter((p) => !p.startsWith('/node_modules/')),
    ],
  };
};
