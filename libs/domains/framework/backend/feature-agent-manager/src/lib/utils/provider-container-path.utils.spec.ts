import { expandProviderPathTildeInContainer } from './provider-container-path.utils';

describe('expandProviderPathTildeInContainer', () => {
  const containerId = 'abc123';

  it('returns HOME when path is exactly ~', async () => {
    const getHome = jest.fn().mockResolvedValue('/root');

    await expect(expandProviderPathTildeInContainer('~', containerId, getHome)).resolves.toBe('/root');
    expect(getHome).toHaveBeenCalledWith(containerId);
  });

  it('expands ~/suffix', async () => {
    const getHome = jest.fn().mockResolvedValue('/root');

    await expect(expandProviderPathTildeInContainer('~/.cursor', containerId, getHome)).resolves.toBe('/root/.cursor');
  });

  it('returns absolute paths unchanged', async () => {
    const getHome = jest.fn();

    await expect(expandProviderPathTildeInContainer('/etc/foo', containerId, getHome)).resolves.toBe('/etc/foo');
    expect(getHome).not.toHaveBeenCalled();
  });
});
