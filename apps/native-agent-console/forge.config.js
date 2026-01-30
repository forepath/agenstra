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
          },
          { name: '@electron-forge/maker-zip' },
        ]
      : []),
    ...(isMac ? [{ name: '@electron-forge/maker-zip' }] : []),
    ...(isLinux
      ? [
          { name: '@electron-forge/maker-zip' },
          {
            name: '@electron-forge/maker-deb',
            config: { name: 'agenstra' },
          },
        ]
      : []),
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
