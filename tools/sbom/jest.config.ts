export default {
  displayName: 'sbom',
  preset: '../../jest.preset.cjs',
  testEnvironment: 'node',
  coverageDirectory: '../../coverage/tools/sbom',
  testMatch: ['**/executors/**/*.spec.ts'],
};
