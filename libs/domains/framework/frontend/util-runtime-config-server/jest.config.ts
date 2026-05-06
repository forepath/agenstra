export default {
  displayName: 'framework-frontend-util-runtime-config-server',
  preset: '../../../../../jest.preset.cjs',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js'],
  coverageDirectory: '../../../../../coverage/libs/domains/framework/frontend/util-runtime-config-server',
};
