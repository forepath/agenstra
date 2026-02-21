import express from 'express';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const app = express();
const port = parseInt(process.env['PORT'] || '4201', 10);

app.get('/config', async (req, res) => {
  const configUrl = process.env['CONFIG'];

  if (!configUrl) {
    return res.json({});
  }

  try {
    const response = await fetch(configUrl);

    if (!response.ok) {
      console.error(`Failed to fetch CONFIG from ${configUrl}: ${response.status} ${response.statusText}`);
      return res.status(500).json({});
    }

    const json = await response.json();
    return res.json(json);
  } catch (error) {
    console.error('Error fetching CONFIG URL:', error);
    return res.status(500).json({});
  }
});

import { dirname } from 'path';
import { fileURLToPath } from 'url';

function getBaseDistPath(): string {
  const mainModule = typeof require !== 'undefined' ? require.main : null;
  if (mainModule?.filename) {
    return resolve(dirname(mainModule.filename), 'browser');
  }

  if (process.argv[1]) {
    try {
      return resolve(dirname(process.argv[1]), 'browser');
    } catch (error) {
      console.warn('Failed to resolve path from process.argv[1]:', error);
    }
  }

  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      const filePath = fileURLToPath(import.meta.url);
      return resolve(dirname(filePath), 'browser');
    }
  } catch {
    // import.meta not available (CommonJS)
  }

  throw new Error(
    'Unable to determine base dist path. ' +
      'The server script location could not be determined. ' +
      'Please ensure the server is run from the correct directory or set SERVER_BASE_PATH environment variable.',
  );
}

const baseDistPath = getBaseDistPath();

const DEFAULT_LOCALE = process.env['DEFAULT_LOCALE'] || 'en';

function getAvailableLocales(): string[] {
  if (!existsSync(baseDistPath)) {
    console.warn(`Build directory not found: ${baseDistPath}`);
    return [DEFAULT_LOCALE];
  }

  try {
    const entries = readdirSync(baseDistPath);
    const locales = entries.filter((entry) => {
      const entryPath = join(baseDistPath, entry);
      return statSync(entryPath).isDirectory();
    });

    if (locales.length === 0) {
      console.warn(`No locale directories found in ${baseDistPath}, using default locale`);
      return [DEFAULT_LOCALE];
    }

    console.log(`Found ${locales.length} locale(s): ${locales.join(', ')}`);
    return locales;
  } catch (error) {
    console.error(`Error reading locales from ${baseDistPath}:`, error);
    return [DEFAULT_LOCALE];
  }
}

const AVAILABLE_LOCALES = getAvailableLocales();

function getLocaleFromRequest(req: express.Request): string {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  if (pathSegments.length > 0 && AVAILABLE_LOCALES.includes(pathSegments[0])) {
    return pathSegments[0];
  }

  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    for (const locale of AVAILABLE_LOCALES) {
      if (acceptLanguage.includes(locale)) {
        return locale;
      }
    }
  }

  return DEFAULT_LOCALE;
}

function getLocaleFromPath(req: express.Request): string | undefined {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  if (pathSegments.length > 0 && AVAILABLE_LOCALES.includes(pathSegments[0])) {
    return pathSegments[0];
  }

  return undefined;
}

function getLocalePath(locale: string): string {
  const localePath = join(baseDistPath, locale);
  if (existsSync(localePath)) {
    return localePath;
  }
  console.warn(`Locale directory not found: ${localePath}, falling back to ${DEFAULT_LOCALE}`);
  return join(baseDistPath, DEFAULT_LOCALE);
}

for (const locale of AVAILABLE_LOCALES) {
  const localePath = getLocalePath(locale);
  app.use(`/${locale}`, express.static(localePath, { index: false }));
}

const defaultLocalePath = getLocalePath(DEFAULT_LOCALE);
app.use(express.static(defaultLocalePath, { index: false }));

app.get('*', (req, res) => {
  const locale = getLocaleFromRequest(req);
  const localePath = getLocalePath(locale);
  const indexPath = join(localePath, 'index.html');

  if (!existsSync(indexPath)) {
    console.error(`Index file not found: ${indexPath}`);
    res.status(404).send('Locale build not found. Please build the application first.');
    return;
  }

  if (!getLocaleFromPath(req)) {
    res.redirect(302, `/${locale}${req.url}`);
    return;
  }

  res.sendFile(resolve(indexPath));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Billing Console server running on http://localhost:${port}`);
  console.log(`📦 Serving files from: ${baseDistPath}`);
  console.log(`🌐 Available locales: ${AVAILABLE_LOCALES.join(', ')}`);
  console.log(`🌍 Default locale: ${DEFAULT_LOCALE}`);
});
