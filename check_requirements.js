import fs from 'fs';
import path from 'path';

function listAll(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
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

function checkFile(file) {
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
                const rel = path.relative(process.cwd(), checkPath).replace(/\\/g, '/');
                if (fs.existsSync(checkPath)) {
                    found = true;
                    // Check case
                    const dirName = path.dirname(rel).replace(/\\/g, '/');
                    const baseName = path.basename(rel);
                    const contents = fs.readdirSync(dirName === '.' ? '.' : dirName);
                    if (!contents.includes(baseName)) {
                        console.log(`CASE MISMATCH in ${file}: requires ${importPath}, resolved as ${rel}, but disk has different case.`);
                    }
                    break;
                }
            }
            if (!found) {
                // Ignore missing service-account.json as it's handled
                if (!importPath.includes('service-account.json')) {
                    console.log(`MISSING FILE in ${file}: requires ${importPath}`);
                }
            }
        }
    }
}

allFiles.filter(f => f.endsWith('.js') && !f.includes('node_modules')).forEach(checkFile);
console.log("Check complete.");
