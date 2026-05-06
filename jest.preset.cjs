// Ensure Jest never inherits CI NODE_ENV=production (JwtModule init, client-endpoint guards, etc.).
process.env.NODE_ENV = 'test';

const nxPreset = require('@nx/jest/preset').default;

module.exports = { ...nxPreset };
