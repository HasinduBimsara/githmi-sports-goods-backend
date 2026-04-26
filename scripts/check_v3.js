import fs from 'fs';
import path from 'path';

function listAll(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git') continue;
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            listAll(fullPath, fileList);
        } else {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const allFiles = listAll('.').map(f => f.replace(/\\/g, '/'));

allFiles.filter(f => f.endsWith('.js')).forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
        const importPath = match[1];
        if (importPath.startsWith('.')) {
            const dir = path.dirname(file).replace(/\\/g, '/');
            const resolved = path.resolve(dir, importPath).replace(/\\/g, '/');
            
            const extensions = ['', '.js', '.json'];
            let found = false;
            for (const ext of extensions) {
                const checkPath = (resolved + ext).replace(/\\/g, '/');
                if (fs.existsSync(checkPath)) {
                    found = true;
                    const rel = path.relative(process.cwd(), checkPath).replace(/\\/g, '/');
                    const dirName = path.dirname(rel).replace(/\\/g, '/');
                    const baseName = path.basename(rel);
                    const contents = fs.readdirSync(dirName === '.' ? '.' : dirName);
                    if (!contents.includes(baseName)) {
                        if (!file.includes('scripts') && !file.includes('seed') && !file.includes('fix')) {
                            console.log(`CRITICAL: Mismatch in ${file}: requires '${importPath}'`);
                        }
                    }
                    break;
                }
            }
        }
    }
});
