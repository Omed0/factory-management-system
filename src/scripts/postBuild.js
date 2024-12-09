const fs = require("fs-extra")
const path = require("path")


async function postBuild() {
    try {
        const cwd = process.cwd()
        const standaloneDir = path.join(cwd, '.next/standalone');
        const publicDir = path.join(cwd, 'public');
        const staticDir = path.join(cwd, '.next/static');
        const standaloneStaticDir = path.join(standaloneDir, '.next');

        // Ensure destination directories exist
        await fs.ensureDir(standaloneDir);
        await fs.ensureDir(standaloneStaticDir);

        // Copy files
        await fs.copy(publicDir, standaloneDir);
        await fs.copy(staticDir, standaloneStaticDir);

        console.log('Post-build copy completed successfully!');
    } catch (error) {
        console.error('Error during post-build copy:', error);
        process.exit(1);
    }
}

postBuild();
