const mediaLibrary = [];
const DEBUG = false; // Debug flag - set to true to enable logging

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
        this.collections = [];
        log(`Created MediaObject: ${this.title} (${this.type}) in folder: ${this.folder}`);
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

// Modify createDefaultCollections to respect folder restrictions
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

    // Create collections only for allowed folders
    const uniqueFolders = [...new Set(mediaLibrary.map(media => media.folder))];
    log(`Found unique folders: ${uniqueFolders.join(', ')}`);
    
    uniqueFolders.forEach(folder => {
        // Only create folder collections for allowed folders
        if (!allowedFolders || allowedFolders.includes(folder)) {
            const collection = new MediaCollection(folder);
            collection.items = MediaCollection.getMedia('folder', folder);
            collections.set(folder, collection);
            log(`Created folder collection: ${folder} with ${collection.items.length} items`);
        } else {
            log(`Skipping folder collection: ${folder} (not in allowed folders)`);
        }
    });
}

// Modify loadLibrary to accept folders parameter
async function loadLibrary(folders = null) {
    log('Loading library...');
    try {
        // Pass folders parameter in the URL if specified
        const url = folders ? `/api/library?folders=${encodeURIComponent(JSON.stringify(folders))}` : '/api/library';
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
        // Use the same URL construction as loadLibrary
        const url = folders ? `/api/library?folders=${encodeURIComponent(JSON.stringify(folders))}` : '/api/library';
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
            else if (!folders || folders.includes(name)) {
                const newItemsForFolder = newMediaObjects.filter(media => media.folder === name);
                newItemsForFolder.forEach(media => collection.add(media));
                log(`Added ${newItemsForFolder.length} items to ${name} folder collection`);
            }
        }

        log('Library check complete');
        return newMediaObjects;

    } catch (error) {
        error("Error checking library:", error);
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
    checkLibrary
};
