const fs = require('fs');

/**
 * Removes context-group elements from Angular i18n XLIF files
 */
function removeContextGroups(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Remove context-group elements and their content
    // This regex matches context-group tags with any content inside
    content = content.replace(
      /<context-group[^>]*>[\s\S]*?<\/context-group>\s*/g,
      '',
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✓ Removed context-groups from ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error.message);
    process.exit(1);
  }
}

// Get file path from command line argument or use default
const filePath = process.argv[2] || null;

if (!filePath || !fs.existsSync(filePath)) {
  console.error(`✗ File not found: ${filePath}`);
  process.exit(1);
}

removeContextGroups(filePath);
