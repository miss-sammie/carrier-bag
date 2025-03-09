const mediaLibrary = [];
const DEBUG = true; // Debug flag - set to true to enable logging

function log(...args) {
    if (DEBUG) console.log('[Media]', ...args);
}

function warn(...args) {
    if (DEBUG) console.warn('[Media]', ...args);
}

function error(...args) {
    // Errors might be important enough to always log
    console.error('[Media]', ...args);
}

class MediaObject {
    constructor(url) {
        this.url = url;
        this.type = this.getMediaType(url);
        this.title = this.extractFilename(url);
        this.dateCreated = new Date();
        this.contributor = null;
        this.folder = this.extractFolder(url);
        this.topLevelFolder = this.extractTopLevelFolder(url);
        this.collections = [];
        log(`Created MediaObject: ${this.title} (${this.type}) in folder: ${this.folder}, top-level: ${this.topLevelFolder}`);
    }

    getMediaType(url) {
        const extension = url.split('.').pop().toLowerCase();
        const mediaTypes = {
            image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            video: ['mp4', 'mov'],
            audio: ['mp3', 'wav', 'ogg', 'aac'],
            shape: ['glb', 'gltf', 'obj']
        };

        for (const [type, extensions] of Object.entries(mediaTypes)) {
            if (extensions.includes(extension)) {
                log(`Determined media type: ${type} for file: ${url}`);
                return type;
            }
        }
        warn(`Unknown media type for file: ${url}`);
        return 'unknown';
    }

    extractFilename(url) {
        const filename = url.split('/').pop().split('.')[0];
        log(`Extracted filename: ${filename} from URL: ${url}`);
        return filename;
    }

    extractFolder(url) {
        const parts = url.split('/');
        const folder = parts[parts.length - 2];
        log(`Extracted folder: ${folder} from URL: ${url}`);
        return folder;
    }

    extractTopLevelFolder(url) {
        // For URLs like /library/media/topFolder/subFolder/file.ext
        const parts = url.split('/');
        // Find the index of 'library' in the path
        const libraryIndex = parts.indexOf('library');
        
        if (libraryIndex === -1) {
            // If 'library' not found, fallback to immediate folder
            return this.folder;
        }
        
        // Extract the full path after 'library'
        const pathAfterLibrary = parts.slice(libraryIndex + 1);
        
        // If we have a path after library, return it for path matching
        if (pathAfterLibrary.length > 0) {
            // Return the full path after library, excluding the filename
            // This allows for matching against any level in the folder hierarchy
            return pathAfterLibrary.slice(0, -1).join('/');
        }
        
        // Fallback to immediate folder if no path after library
        return this.folder;
    }

    addToCollection(collection) {
        if (!this.collections.includes(collection)) {
            this.collections.push(collection);
        }
    }

    setContributor(name) {
        this.contributor = name;
    }
}

const collections = new Map();

class MediaCollection {
    constructor(name) {
        this.name = name;
        this.items = [];
        log(`Created MediaCollection: ${name}`);
    }

    static getMedia(parameter, value) {
        log(`Filtering media by ${parameter}: ${value}`);
        switch(parameter) {
            case 'type':
                const typeResults = mediaLibrary.filter(media => media.type === value);
                log(`Found ${typeResults.length} items of type: ${value}`);
                return typeResults;
            case 'folder':
                const folderResults = mediaLibrary.filter(media => media.folder === value);
                log(`Found ${folderResults.length} items in folder: ${value}`);
                return folderResults;
            case 'topLevelFolder':
                // Updated to handle path-based matching
                const topFolderResults = mediaLibrary.filter(media => {
                    // Exact match
                    if (media.topLevelFolder === value) return true;
                    
                    // Check if the folder is a subdirectory of the value
                    // For example, if value is "media/avatars", it should match "media/avatars/subfolder"
                    if (media.topLevelFolder.startsWith(value + '/')) return true;
                    
                    // Check if the value is a subdirectory of the folder
                    // For example, if value is "avatars" and topLevelFolder is "media/avatars"
                    const pathParts = media.topLevelFolder.split('/');
                    return pathParts.includes(value);
                });
                log(`Found ${topFolderResults.length} items in or related to folder path: ${value}`);
                return topFolderResults;
            default:
                error(`Invalid filter parameter: ${parameter}`);
                throw new Error(`Invalid filter parameter: ${parameter}`);
        }
    }

    add(mediaObj) {
        if (!this.items.includes(mediaObj)) {
            this.items.push(mediaObj);
            log(`Added ${mediaObj.title} to collection: ${this.name}`);
            mediaObj.addToCollection(this.name);
        } else {
            warn(`${mediaObj.title} already exists in collection: ${this.name}`);
        }
    }

    remove(mediaObj) {
        const index = this.items.indexOf(mediaObj);
        if (index > -1) {
            this.items.splice(index, 1);
            log(`Removed ${mediaObj.title} from collection: ${this.name}`);
            mediaObj.collections = mediaObj.collections.filter(c => c !== this.name);
        } else {
            warn(`${mediaObj.title} not found in collection: ${this.name}`);
        }
    }

    getAll() {
        log(`Getting all items from collection: ${this.name} (${this.items.length} items)`);
        return this.items;
    }
}

// Modify createDefaultCollections to respect folder restrictions and handle nested folder structures
function createDefaultCollections(mediaLibrary, allowedFolders = null) {
    log('Creating default collections...');
    
    // Create collections for each media type
    ['image', 'video', 'audio', 'shape'].forEach(type => {
        const name = type.charAt(0).toUpperCase() + type.slice(1) + 's';  // e.g., "Videos"
        const collection = new MediaCollection(name);
        collection.items = MediaCollection.getMedia('type', type);
        collections.set(name, collection);
        log(`Created type collection: ${name} with ${collection.items.length} items`);
    });

    // Create collections for immediate folders
    const uniqueFolders = [...new Set(mediaLibrary.map(media => media.folder))];
    log(`Found unique immediate folders: ${uniqueFolders.join(', ')}`);
    
    uniqueFolders.forEach(folder => {
        // Only create immediate folder collections if no allowedFolders specified or it's in allowedFolders
        if (!allowedFolders || allowedFolders.some(allowedFolder => 
            folder === allowedFolder || 
            folder.includes(allowedFolder) || 
            allowedFolder.includes(folder)
        )) {
            const collection = new MediaCollection(folder);
            collection.items = MediaCollection.getMedia('folder', folder);
            collections.set(folder, collection);
            log(`Created folder collection: ${folder} with ${collection.items.length} items`);
        } else {
            log(`Skipping immediate folder collection: ${folder} (not in allowed folders)`);
        }
    });

    // Create collections for specified folders that include all their subdirectories
    if (allowedFolders && allowedFolders.length > 0) {
        log(`Creating collections for allowed folders: ${allowedFolders.join(', ')}`);
        
        allowedFolders.forEach(folderPath => {
            // Create a collection for this folder if it doesn't exist yet
            if (!collections.has(folderPath)) {
                const collection = new MediaCollection(folderPath);
                collections.set(folderPath, collection);
                log(`Created folder collection: ${folderPath}`);
            }
            
            // Add all media from this folder and its subdirectories
            const folderCollection = collections.get(folderPath);
            
            // Use the updated getMedia method to find all media in this folder path
            const mediaInFolder = MediaCollection.getMedia('topLevelFolder', folderPath);
            
            // Add all found media to the collection
            mediaInFolder.forEach(media => folderCollection.add(media));
            
            log(`Updated folder collection: ${folderPath} with ${folderCollection.items.length} items`);
        });
    }
}

// Modify loadLibrary to accept folders parameter
async function loadLibrary(folders = null) {
    log('Loading library...');
    try {
        // Pass folders parameter in the URL if specified, and add includeSubdirectories=true
        const url = folders ? 
            `/api/library?folders=${encodeURIComponent(JSON.stringify(folders))}&includeSubdirectories=true` : 
            '/api/library';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const files = await response.json();
        log(`Fetched ${files.length} files from server`);
        
        // Clear existing library
        mediaLibrary.length = 0;
        log('Cleared existing library');
        
        // Create MediaObjects for each file URL
        files.forEach(url => {
            const mediaObj = new MediaObject(url);
            mediaLibrary.push(mediaObj);
        });
        log(`Created ${mediaLibrary.length} MediaObjects`);
        
        // Create collections after all media is loaded, passing the folders parameter
        createDefaultCollections(mediaLibrary, folders);
        log('Library load complete');
        
        return mediaLibrary;
        
    } catch (error) {
        error("Error loading library:", error);
        createDefaultCollections([], folders);
        return mediaLibrary;
    }
}

// Function to create a new custom collection
function createCollection(name) {
    if (collections.has(name)) {
        throw new Error(`Collection "${name}" already exists`);
    }
    const collection = new MediaCollection(name);
    collections.set(name, collection);
    return collection;
}

// Function to get a collection by name
function getCollection(name) {
    const collection = collections.get(name);
    if (collection) {
        log(`Retrieved collection: ${name} (${collection.items.length} items)`);
    } else {
        warn(`Collection not found: ${name}`);
    }
    return collection;
}

async function checkLibrary(folders = null) {
    log('Checking for new files in library...');
    try {
        // Use the same URL construction as loadLibrary with includeSubdirectories
        const url = folders ? 
            `/api/library?folders=${encodeURIComponent(JSON.stringify(folders))}&includeSubdirectories=true` : 
            '/api/library';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const files = await response.json();
        log(`Found ${files.length} total files on server`);

        // Get current file URLs in the library
        const existingUrls = new Set(mediaLibrary.map(media => media.url));
        
        // Find new files
        const newFiles = files.filter(url => !existingUrls.has(url));
        
        if (newFiles.length === 0) {
            log('No new files found');
            return [];
        }

        log(`Found ${newFiles.length} new files`);
        
        // Create MediaObjects for new files
        const newMediaObjects = newFiles.map(url => {
            const mediaObj = new MediaObject(url);
            mediaLibrary.push(mediaObj);
            return mediaObj;
        });

        // Update existing collections with new media
        for (const [name, collection] of collections.entries()) {
            // For type-based collections (Videos, Images, etc.)
            if (['Videos', 'Images', 'Audios', 'Shapes'].includes(name)) {
                const type = name.toLowerCase().slice(0, -1); // Remove 's' and convert to lowercase
                const newItemsForType = newMediaObjects.filter(media => media.type === type);
                newItemsForType.forEach(media => collection.add(media));
                log(`Added ${newItemsForType.length} items to ${name} collection`);
            }
            // For folder-based collections
            else {
                // Check if this is a folder collection that should include the new media
                // Use the same flexible matching logic as in getMedia
                const newItemsForFolder = newMediaObjects.filter(media => {
                    // Exact match with immediate folder
                    if (media.folder === name) return true;
                    
                    // Path-based matching with topLevelFolder
                    if (media.topLevelFolder === name) return true;
                    if (media.topLevelFolder.startsWith(name + '/')) return true;
                    
                    // Check if the folder name is part of the path
                    const pathParts = media.topLevelFolder.split('/');
                    return pathParts.includes(name);
                });
                
                if (newItemsForFolder.length > 0) {
                    newItemsForFolder.forEach(media => collection.add(media));
                    log(`Added ${newItemsForFolder.length} items to ${name} folder collection`);
                }
            }
        }

        log('Library check complete');
        return newMediaObjects;

    } catch (error) {
        error("Error checking library:", error);
        return [];
    }
}

/**
 * Fetches media from a remote application and adds it to the library
 * @param {string} remoteUrl - The base URL of the remote application
 * @param {string} endpoint - The API endpoint to fetch media from
 * @param {Object} options - Additional options for the fetch request
 * @param {string} targetFolder - Optional folder to assign to all fetched media
 * @returns {Array} - Array of new MediaObjects added to the library
 */
async function fetchRemoteMedia(remoteUrl, endpoint = '/api/media', options = {}, targetFolder = null) {
    log(`Fetching media from remote source: ${remoteUrl}${endpoint}${targetFolder ? ` to folder: ${targetFolder}` : ''}`);
    try {
        // Construct the full URL
        const url = `${remoteUrl}${endpoint}`;
        
        // Set up fetch options with defaults
        const fetchOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                ...options.headers
            },
            mode: 'cors',
            ...options
        };
        
        // Make the request
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
            throw new Error(`Remote API error! status: ${response.status}`);
        }
        
        // Parse the response - expecting an array of media URLs or objects
        const remoteMedia = await response.json();
        log(`Received ${remoteMedia.length} media items from remote source`);
        
        // Get current file URLs in the library
        const existingUrls = new Set(mediaLibrary.map(media => media.url));
        
        // Process the remote media
        const newMediaObjects = [];
        
        remoteMedia.forEach(item => {
            // Handle both string URLs and objects with url property
            const mediaUrl = typeof item === 'string' ? item : item.url;
            
            // Skip if already in library
            if (existingUrls.has(mediaUrl)) {
                log(`Skipping existing media: ${mediaUrl}`);
                return;
            }
            
            // Create new MediaObject
            const mediaObj = new MediaObject(mediaUrl);
            
            // Override folder if targetFolder is specified
            if (targetFolder) {
                mediaObj.folder = targetFolder;
                log(`Assigned media to folder: ${targetFolder}`);
            }
            
            // Add additional metadata if available
            if (typeof item === 'object') {
                if (item.title) mediaObj.title = item.title;
                if (item.contributor) mediaObj.setContributor(item.contributor);
                // Use folder from metadata if provided and no targetFolder override
                if (item.folder && !targetFolder) mediaObj.folder = item.folder;
                // Add any other metadata fields as needed
            }
            
            // Add to library
            mediaLibrary.push(mediaObj);
            newMediaObjects.push(mediaObj);
        });
        
        log(`Added ${newMediaObjects.length} new media objects from remote source`);
        
        // Update collections with new media
        for (const [name, collection] of collections.entries()) {
            // For type-based collections (Videos, Images, etc.)
            if (['Videos', 'Images', 'Audios', 'Shapes'].includes(name)) {
                const type = name.toLowerCase().slice(0, -1); // Remove 's' and convert to lowercase
                const newItemsForType = newMediaObjects.filter(media => media.type === type);
                newItemsForType.forEach(media => collection.add(media));
                log(`Added ${newItemsForType.length} items to ${name} collection`);
            }
            // For folder-based collections
            else {
                const newItemsForFolder = newMediaObjects.filter(media => media.folder === name);
                newItemsForFolder.forEach(media => collection.add(media));
                log(`Added ${newItemsForFolder.length} items to ${name} folder collection`);
            }
        }
        
        // If targetFolder is specified and not already a collection, create it
        if (targetFolder && !collections.has(targetFolder) && newMediaObjects.length > 0) {
            const folderCollection = new MediaCollection(targetFolder);
            newMediaObjects.filter(media => media.folder === targetFolder)
                .forEach(media => folderCollection.add(media));
            collections.set(targetFolder, folderCollection);
            log(`Created new folder collection: ${targetFolder}`);
        }
        
        return newMediaObjects;
        
    } catch (err) {
        error("Error fetching remote media:", err);
        return [];
    }
}

export { 
    MediaObject, 
    MediaCollection,
    mediaLibrary, 
    loadLibrary,
    collections,
    createCollection,
    getCollection,
    checkLibrary,
    fetchRemoteMedia
};
