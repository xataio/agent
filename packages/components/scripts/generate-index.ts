import * as fs from 'fs';
import * as path from 'path';

const EXTENSIONS = ['.ts', '.tsx'];
const FOLDERS = ['components', 'hooks'];

/**
 * Recursively lists all TypeScript files in a directory and its subdirectories.
 * @param dir The directory to list files in.
 * @returns An array of file paths.
 */
function getAllFiles(dir: string): string[] {
  let files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(getAllFiles(entryPath));
    } else if (entry.isFile() && EXTENSIONS.includes(path.extname(entry.name)) && !entry.name.startsWith('index.')) {
      files.push(entryPath);
    }
  }

  return files;
}

/**
 * Generates an `index.ts` file in the specified directory, exporting all files found in that directory.
 * @param dir The directory to generate the index file for.
 */
function generateIndexFile(dir: string): void {
  const files = getAllFiles(dir);
  const exports = files.map((file) => {
    const relativePath = `./${path
      .relative(dir, file)
      .replace(/\\/g, '/')
      .replace(/\.tsx?$/, '')}`;
    return `export * from '${relativePath}';`;
  });

  const indexPath = path.join(dir, 'index.ts');
  fs.writeFileSync(indexPath, exports.join('\n'), 'utf-8');
  console.log(`Index file generated at: ${indexPath}`);
}

for (const folder of FOLDERS) {
  const targetDir = path.resolve(__dirname, `../src/${folder}`);
  generateIndexFile(targetDir);
}
