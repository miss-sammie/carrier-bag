import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function scanLibrary(folders = null) {
    try {
        const libraryPath = './public/library';
        const libraries = await readdir(libraryPath, { withFileTypes: true });
        
        // Get all subdirectories (these are our libraries)
        let subDirs = libraries.filter(dirent => dirent.isDirectory());
        
        // If folders is specified, filter to only include those folders
        if (folders && Array.isArray(folders)) {
            subDirs = subDirs.filter(dirent => folders.includes(dirent.name));
        }
        
        const mediaFiles = [];
        
        for (const dir of subDirs) {
            const libraryName = dir.name;
            const libraryDir = join(libraryPath, libraryName);
            
            const files = await readdir(libraryDir, { withFileTypes: true });
            
            files.filter(file => {
                const extension = file.name.split('.').pop().toLowerCase();
                return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'mp3', 'wav', 'ogg', 'aac', 'glb', 'gltf', 'obj'].includes(extension);
            }).forEach(file => {
                mediaFiles.push(`/library/${libraryName}/${file.name}`);
            });
        }
        
        return mediaFiles;
    } catch (error) {
        console.error("Error scanning library:", error);
        return [];
    }
} 