import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

export async function scanLibrary(folders = null) {
    try {
        const libraryPath = join(rootDir, 'public', 'library');
        const mediaFiles = [];
        
        // Recursive function to scan directories
        async function scanDirectoryRecursively(dirPath, basePath) {
            try {
                const entries = await readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = join(dirPath, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Recursively scan subdirectories
                        await scanDirectoryRecursively(fullPath, basePath);
                    } else {
                        // Check if file is a media file
                        const extension = entry.name.split('.').pop().toLowerCase();
                        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'mp3', 'wav', 'ogg', 'aac', 'glb', 'gltf', 'obj'].includes(extension)) {
                            // Create a path relative to the library root
                            const relativePath = fullPath.replace(basePath, '').replace(/\\/g, '/');
                            mediaFiles.push(`/library${relativePath}`);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error scanning directory ${dirPath}:`, error);
            }
        }
        
        // Get all subdirectories (these are our libraries)
        const libraries = await readdir(libraryPath, { withFileTypes: true });
        let subDirs = libraries.filter(dirent => dirent.isDirectory());
        
        // If folders is specified, filter to only include those folders
        if (folders && Array.isArray(folders)) {
            subDirs = subDirs.filter(dirent => folders.includes(dirent.name));
        }
        
        // Scan each subdirectory recursively
        for (const dir of subDirs) {
            const libraryName = dir.name;
            const libraryDir = join(libraryPath, libraryName);
            await scanDirectoryRecursively(libraryDir, libraryPath);
        }
        
        console.log(`Found ${mediaFiles.length} media files in library`);
        return mediaFiles;
    } catch (error) {
        console.error("Error scanning library:", error);
        return [];
    }
} 