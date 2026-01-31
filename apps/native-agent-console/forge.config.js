// Support cross-building (e.g. Windows on Linux via Wine)
const buildPlatform = process.env.ELECTRON_FORGE_PLATFORM || process.platform;
const isLinux = buildPlatform === 'linux';
const isWindows = buildPlatform === 'win32';
const isMac = buildPlatform === 'darwin';
module.exports = {
  packagerConfig: {
    asar: true,
    extraResource: ['./server'],
    ignore: [/^\/\.git/, /^\/node_modules\/\.cache/, /^\/\.vscode/, /^\/\.idea/, /^\/\.DS_Store/],
    prune: false,
  },
  makers: [
    ...(isWindows
      ? [
          {
            name: '@electron-forge/maker-squirrel',
            config: { name: 'agenstra' },
            platforms: ['win32'],
          },
          {
            name: '@electron-forge/maker-zip',
            platforms: ['win32'],
          },
        ]
      : []),
    ...(isMac
      ? [
          {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
          },
        ]
      : []),
    ...(isLinux
      ? [
          {
            name: '@electron-forge/maker-zip',
            platforms: ['linux'],
          },
          {
            name: '@electron-forge/maker-deb',
            config: { name: 'agenstra' },
            platforms: ['linux'],
          },
        ]
      : []),
  ],
  plugins: [],
};
