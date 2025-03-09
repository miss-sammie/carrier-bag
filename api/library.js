import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'url';

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

export async function scanLibrary(folders = null, includeSubdirectories = false) {
    try {
        const libraryPath = join(rootDir, 'public', 'library');
        const mediaFiles = [];
        const foundDirectories = new Map(); // To track all directories found during scanning
        
        // Recursive function to scan directories and collect all subdirectories
        async function scanDirectoryRecursively(dirPath, basePath, currentRelativePath = '') {
            try {
                const entries = await readdir(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = join(dirPath, entry.name);
                    
                    if (entry.isDirectory()) {
                        // Calculate the relative path for this directory
                        const relativeDirPath = currentRelativePath ? 
                            `${currentRelativePath}/${entry.name}` : entry.name;
                        
                        // Store this directory in our map
                        foundDirectories.set(relativeDirPath, fullPath);
                        
                        // Recursively scan subdirectories
                        await scanDirectoryRecursively(fullPath, basePath, relativeDirPath);
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
        
        // First, scan the entire library to find all directories
        await scanDirectoryRecursively(libraryPath, libraryPath);
        
        // If folders is specified, filter media files based on the specified folders
        if (folders && Array.isArray(folders) && folders.length > 0) {
            // Clear the mediaFiles array since we'll be re-adding only the files we want
            mediaFiles.length = 0;
            
            // For each specified folder, find matching directories at any level
            for (const folder of folders) {
                const matchingDirs = [];
                
                // Check for exact match
                if (foundDirectories.has(folder)) {
                    matchingDirs.push(foundDirectories.get(folder));
                }
                
                // Check for directories that are subdirectories of the specified folder
                for (const [dirPath, fullPath] of foundDirectories.entries()) {
                    if (dirPath.startsWith(`${folder}/`)) {
                        matchingDirs.push(fullPath);
                    }
                }
                
                // Check for directories where the specified folder is a part of the path
                // This handles cases like "avatars" matching "media/avatars"
                if (matchingDirs.length === 0) {
                    for (const [dirPath, fullPath] of foundDirectories.entries()) {
                        const parts = dirPath.split('/');
                        if (parts.includes(folder)) {
                            matchingDirs.push(fullPath);
                        }
                    }
                }
                
                // Scan all matching directories
                for (const dirPath of matchingDirs) {
                    await scanDirectoryRecursively(dirPath, libraryPath);
                }
            }
        }
        
        console.log(`Found ${mediaFiles.length} media files in library`);
        return mediaFiles;
    } catch (error) {
        console.error("Error scanning library:", error);
        return [];
    }
} 