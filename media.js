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

// Create default type-based collections
function createDefaultCollections(mediaLibrary) {
    log('Creating default collections...');
    
    // Create collections for each media type
    ['image', 'video', 'audio', 'shape'].forEach(type => {
        const name = type.charAt(0).toUpperCase() + type.slice(1) + 's';  // e.g., "Videos"
        const collection = new MediaCollection(name);
        collection.items = MediaCollection.getMedia('type', type);
        collections.set(name, collection);
        log(`Created type collection: ${name} with ${collection.items.length} items`);
    });

    // Create collections for each folder
    const uniqueFolders = [...new Set(mediaLibrary.map(media => media.folder))];
    log(`Found unique folders: ${uniqueFolders.join(', ')}`);
    
    uniqueFolders.forEach(folder => {
        const collection = new MediaCollection(folder);
        collection.items = MediaCollection.getMedia('folder', folder);
        collections.set(folder, collection);
        log(`Created folder collection: ${folder} with ${collection.items.length} items`);
    });
}

// Modify loadLibrary to create default collections
async function loadLibrary() {
    log('Loading library...');
    try {
        const response = await fetch('/api/library');
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
        
        // Create collections after all media is loaded
        createDefaultCollections(mediaLibrary);
        log('Library load complete');
        
        return mediaLibrary;
        
    } catch (error) {
        error("Error loading library:", error);
        createDefaultCollections([]);
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

export { 
    MediaObject, 
    MediaCollection,
    mediaLibrary, 
    loadLibrary,
    collections,
    createCollection,
    getCollection
};
