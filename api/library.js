import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function scanLibrary() {
    try {
        const libraryPath = './public/library';
        const libraries = await readdir(libraryPath, { withFileTypes: true });
        
        // Get all subdirectories (these are our libraries)
        const subDirs = libraries.filter(dirent => dirent.isDirectory());
        
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