import * as fs from 'fs/promises';
import { marked } from 'marked';
import * as path from 'path';

// Type definitions (inline since we can't import from the library easily in this script)
interface DocMetadata {
  path: string;
  title: string;
  summary: string;
  headings: Array<{ level: number; text: string; id: string }>;
  content: string;
  html?: string;
}

interface NavigationNode {
  title: string;
  path: string;
  file: string;
  children?: NavigationNode[];
  order?: number;
}

interface SearchIndexEntry {
  path: string;
  title: string;
  summary: string;
  content: string;
  headings: string[];
}

interface SearchIndex {
  entries: SearchIndexEntry[];
}

/**
 * Build-time documentation generator
 * Scans /docs/agenstra and generates navigation.json and index.json
 */

const DOCS_ROOT = path.join(process.cwd(), 'docs', 'agenstra');
// Generate to a temp location that won't be cleaned by Angular build
const OUTPUT_DIR = path.join(process.cwd(), 'dist', 'apps', 'frontend-docs-temp', 'assets', 'docs');
const CONTENT_OUTPUT_DIR = path.join(process.cwd(), 'dist', 'apps', 'frontend-docs-temp', 'public', 'docs');

interface FileInfo {
  path: string;
  content: string;
}

/**
 * Recursively scan directory for markdown files
 */
async function scanMarkdownFiles(dir: string, basePath: string = ''): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      const subFiles = await scanMarkdownFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Read and parse markdown file
 */
async function readMarkdownFile(filePath: string): Promise<FileInfo> {
  const fullPath = path.join(DOCS_ROOT, filePath);
  const content = await fs.readFile(fullPath, 'utf-8');
  return { path: filePath, content };
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, filePath: string): string {
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }

  // Fallback: extract from filename
  const fileName = filePath.split('/').pop() || filePath;
  const nameWithoutExt = fileName.replace(/\.md$/, '');
  return nameWithoutExt
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Extract summary from first paragraph
 */
function extractSummary(content: string): string {
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/m, '');
  const parts = withoutFrontmatter.split(/\n\n+/).map((s) => s.trim());
  const firstPara = parts.find((p) => p && !p.startsWith('#') && p.length > 20);

  if (firstPara) {
    return firstPara
      .replace(/[#*_`\[\]]/g, '')
      .replace(/\n/g, ' ')
      .trim()
      .substring(0, 200);
  }

  return '';
}

/**
 * Extract headings from markdown
 */
function extractHeadings(content: string): Array<{ level: number; text: string; id: string }> {
  const headings: Array<{ level: number; text: string; id: string }> = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)/);
    const h2Match = line.match(/^##\s+(.+)/);
    const h3Match = line.match(/^###\s+(.+)/);
    const h4Match = line.match(/^####\s+(.+)/);
    const h5Match = line.match(/^#####\s+(.+)/);
    const h6Match = line.match(/^######\s+(.+)/);

    let level: number | null = null;
    let text: string | null = null;

    if (h1Match) {
      level = 1;
      text = h1Match[1].trim();
    } else if (h2Match) {
      level = 2;
      text = h2Match[1].trim();
    } else if (h3Match) {
      level = 3;
      text = h3Match[1].trim();
    } else if (h4Match) {
      level = 4;
      text = h4Match[1].trim();
    } else if (h5Match) {
      level = 5;
      text = h5Match[1].trim();
    } else if (h6Match) {
      level = 6;
      text = h6Match[1].trim();
    }

    if (level && text) {
      // Strip markdown link syntax from heading text
      // Convert [text](url) to just "text"
      text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      headings.push({ level, text, id });
    }
  }

  return headings;
}

/**
 * Build navigation tree from file list
 */
function buildNavigationTree(files: string[], basePath: string = '/docs'): NavigationNode[] {
  const tree: NavigationNode[] = [];
  const nodeMap = new Map<string, NavigationNode>();

  const sortedFiles = [...files].sort();

  for (const file of sortedFiles) {
    const parts = file.split('/');
    const fileName = parts[parts.length - 1];
    const isReadme = fileName.toLowerCase() === 'readme.md';

    const pathSegments = parts.slice(0, -1);
    const routePath = buildRoutePath(basePath, file, isReadme);

    let parent: NavigationNode[] = tree;
    let currentPath = '';

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      let folderNode = nodeMap.get(currentPath);
      if (!folderNode) {
        const folderRoutePath = buildRoutePath(basePath, `${currentPath}/README.md`, true);
        folderNode = {
          title: formatTitle(segment),
          path: folderRoutePath,
          file: `${currentPath}/README.md`,
          children: [],
        };
        nodeMap.set(currentPath, folderNode);
        parent.push(folderNode);
      }

      parent = folderNode.children || [];
    }

    const fileTitle = isReadme
      ? formatTitle(pathSegments[pathSegments.length - 1] || 'Documentation')
      : formatTitle(fileName.replace(/\.md$/, ''));

    const fileNode: NavigationNode = {
      title: fileTitle,
      path: routePath,
      file: file,
    };

    if (isReadme && pathSegments.length > 0) {
      const folderPath = pathSegments.join('/');
      const folderNode = nodeMap.get(folderPath);
      if (folderNode) {
        folderNode.file = file;
        folderNode.path = routePath;
      }
    } else {
      const parentPath = pathSegments.join('/');
      if (parentPath && nodeMap.has(parentPath)) {
        const parentNode = nodeMap.get(parentPath)!;
        if (!parentNode.children) {
          parentNode.children = [];
        }
        parentNode.children.push(fileNode);
      } else {
        tree.push(fileNode);
      }
    }
  }

  sortNavigationNodes(tree);
  return tree;
}

function buildRoutePath(basePath: string, file: string, isReadme: boolean): string {
  const pathWithoutExt = file.replace(/\.md$/, '');

  // Remove "agenstra/" prefix from file path for route generation
  // Files are in "agenstra/" folder, but routes don't include this prefix
  const pathWithoutAgenstra = pathWithoutExt.startsWith('agenstra/')
    ? pathWithoutExt.substring('agenstra/'.length)
    : pathWithoutExt;

  if (isReadme) {
    const parts = pathWithoutAgenstra.split('/');
    parts.pop(); // Remove 'README'
    const dirPath = parts.join('/');
    return dirPath ? `${basePath}/${dirPath}` : basePath;
  }

  return `${basePath}/${pathWithoutAgenstra}`;
}

function formatTitle(name: string): string {
  return name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function sortNavigationNodes(nodes: NavigationNode[]): void {
  // Sort nodes: categories (folders with non-empty children) first, then links (files without children property or empty children)
  // Both sorted alphabetically within their group
  // IMPORTANT: Use a stable sort by first separating categories and links, then sorting each group
  const categories: NavigationNode[] = [];
  const links: NavigationNode[] = [];

  // Separate categories and links
  for (const node of nodes) {
    // A node is a category if it has a children property AND has at least one child
    // A node is a link if it doesn't have a children property OR has an empty children array
    if (node.children !== undefined && node.children.length > 0) {
      categories.push(node);
    } else {
      links.push(node);
    }
  }

  // Sort each group alphabetically
  categories.sort((a, b) => a.title.localeCompare(b.title));
  links.sort((a, b) => a.title.localeCompare(b.title));

  // Replace the original array with sorted categories first, then links
  nodes.length = 0;
  nodes.push(...categories, ...links);

  // Recursively sort children
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      sortNavigationNodes(node.children);
    }
  }
}

/**
 * Extract searchable content from markdown
 */
function extractSearchableContent(content: string): string {
  let text = content;
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`[^`]+`/g, '');
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
  text = text.replace(/^#+\s+/gm, '');
  text = text.replace(/^---[\s\S]*?---\s*/m, '');
  text = text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Main generation function
 */
async function generateDocs(): Promise<void> {
  console.log('Generating documentation files...');

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Check if docs directory exists
  try {
    await fs.access(DOCS_ROOT);
  } catch {
    console.warn(`Docs directory not found: ${DOCS_ROOT}`);
    // Create empty navigation and index
    await fs.writeFile(path.join(OUTPUT_DIR, 'navigation.json'), JSON.stringify({ sections: [] }, null, 2));
    await fs.writeFile(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify({ entries: [] }, null, 2));
    return;
  }

  // Scan for markdown files
  const files = await scanMarkdownFiles(DOCS_ROOT);
  console.log(`Found ${files.length} markdown files`);

  // Read all files
  const fileContents = await Promise.all(files.map((f) => readMarkdownFile(f)));

  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Parse files and extract metadata
  const metadata: DocMetadata[] = await Promise.all(
    fileContents.map(async (file) => {
      const title = extractTitle(file.content, file.path);
      const summary = extractSummary(file.content);
      const headings = extractHeadings(file.content);
      const html = marked.parse(file.content) as string;

      return {
        path: file.path,
        title,
        summary,
        headings: headings.map((h) => ({
          level: h.level,
          text: h.text,
          id: h.id,
        })),
        content: file.content,
        html,
      };
    }),
  );

  // Build navigation tree
  // Note: Routes don't include "agenstra" prefix, but files are in "agenstra/" folder
  const navigationTree = buildNavigationTree(files, '/docs');

  // Build search index
  const searchIndex: SearchIndex = {
    entries: metadata.map((doc) => {
      const pathWithoutExt = doc.path.replace(/\.md$/, '');
      const isReadme = doc.path.toLowerCase().endsWith('readme.md');

      // Remove "agenstra/" prefix from file path for route generation
      // Files are in "agenstra/" folder, but routes don't include this prefix
      const pathWithoutAgenstra = pathWithoutExt.startsWith('agenstra/')
        ? pathWithoutExt.substring('agenstra/'.length)
        : pathWithoutExt;

      let routePath: string;

      if (isReadme) {
        const parts = pathWithoutAgenstra.split('/');
        parts.pop(); // Remove 'README'
        const dirPath = parts.join('/');
        routePath = dirPath ? `/docs/${dirPath}` : '/docs';
      } else {
        routePath = `/docs/${pathWithoutAgenstra}`;
      }

      return {
        path: routePath,
        title: doc.title,
        summary: doc.summary,
        content: extractSearchableContent(doc.content),
        headings: doc.headings.map((h) => h.text),
      };
    }),
  };

  // Write navigation.json
  await fs.writeFile(path.join(OUTPUT_DIR, 'navigation.json'), JSON.stringify({ sections: navigationTree }, null, 2));

  // Write index.json
  await fs.writeFile(path.join(OUTPUT_DIR, 'index.json'), JSON.stringify(searchIndex, null, 2));

  // Copy markdown files to public directory for serving
  // Preserve the agenstra folder structure: agenstra/file.md -> public/docs/agenstra/file.md
  await fs.mkdir(CONTENT_OUTPUT_DIR, { recursive: true });
  for (const file of files) {
    const sourcePath = path.join(DOCS_ROOT, file);
    // Preserve agenstra folder: file is like "getting-started.md" or "features/README.md"
    // We want it at public/docs/agenstra/getting-started.md
    const destPath = path.join(CONTENT_OUTPUT_DIR, 'agenstra', file);
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });
    await fs.copyFile(sourcePath, destPath);
  }

  console.log('Documentation files generated successfully!');
  console.log(`- Navigation: ${navigationTree.length} root sections`);
  console.log(`- Search index: ${searchIndex.entries.length} entries`);
  console.log(`- Content files: ${files.length} markdown files copied`);
}

// Run if executed directly
// For ES modules, we can check if this is the main module by comparing import.meta.url with the script path
// Since we're compiling with --module esnext, we use ES module syntax
const getCurrentFilePath = () => {
  const url = import.meta.url;
  // Remove file:// protocol and handle both absolute and relative paths
  if (url.startsWith('file://')) {
    return url.replace('file://', '');
  }
  return url;
};

const currentFilePath = getCurrentFilePath();
const scriptPath = process.argv[1];
// Check if the current file matches the script being executed
const isMainModule =
  currentFilePath === scriptPath ||
  currentFilePath.endsWith(scriptPath) ||
  scriptPath.endsWith(currentFilePath) ||
  currentFilePath.includes('generate-docs.js');

if (isMainModule) {
  generateDocs().catch((error) => {
    console.error('Error generating documentation:', error);
    process.exit(1);
  });
}

export { generateDocs };
