import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const cwd = process.cwd();
const entries = readdirSync(cwd);
const svgs = entries
  .filter((name) => extname(name).toLowerCase() === '.svg')
  .filter((name) => {
    try {
      return statSync(join(cwd, name)).isFile();
    } catch {
      return false;
    }
  })
  .sort((a, b) => a.localeCompare(b, 'en'));

writeFileSync(join(cwd, 'svgs.json'), JSON.stringify(svgs, null, 2));
console.log(`Wrote ${svgs.length} SVG names to svgs.json`);
