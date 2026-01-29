const path = require('path');
const { transform } = require('.');

const result = transform({
  source: path.join(process.cwd(), '.agenstra'),
  target: process.argv.slice(2).length ? process.argv.slice(2) : ['cursor', 'opencode', 'github-copilot'],
  outputDir: process.cwd(),
  dryRun: false,
});
console.log(result.success ? 'OK' : result.errors);
process.exit(result.success ? 0 : 1);
