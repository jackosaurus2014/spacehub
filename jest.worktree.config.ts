// TEMPORARY (untracked): jest config for running the suite from inside a
// `.claude/worktrees/*` checkout, where the dot-directory in the path breaks
// the glob-based testMatch of jest.config.ts. Not committed.
import type { Config } from 'jest';
import baseConfig from './jest.config';

export default async (): Promise<Config> => {
  const resolved = await baseConfig();
  return {
    ...resolved,
    rootDir: __dirname,
    testMatch: undefined,
    testRegex: ['src[\\\\/].*__tests__[\\\\/].*\\.tsx?$', 'src[\\\\/].*\\.(spec|test)\\.tsx?$'],
    testPathIgnorePatterns: ['node_modules'],
    modulePathIgnorePatterns: [],
  };
};
