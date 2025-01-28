class MediaObject {
    constructor(url) {
        this.url = url;
        this.type = this.getMediaType(url);
        this.title = this.extractFilename(url);
        this.dateCreated = new Date();
        this.contributor = null;
        this.collections = [];
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
                return type;
            }
        }
        return 'unknown';
    }

    extractFilename(url) {
        // Remove path and extension
        return url.split('/').pop().split('.')[0];
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

const mediaLibrary = [];

class MediaCollection {
    constructor(name) {
        this.name = name;
        this.items = [];
    }

    add(mediaObj) {
        if (!this.items.includes(mediaObj)) {
            this.items.push(mediaObj);
            mediaObj.addToCollection(this.name);
        }
    }

    remove(mediaObj) {
        const index = this.items.indexOf(mediaObj);
        if (index > -1) {
            this.items.splice(index, 1);
            mediaObj.collections = mediaObj.collections.filter(c => c !== this.name);
        }
    }

    getAll() {
        return this.items;
    }
}

// Store all collections
const collections = new Map();

// Create default type-based collections
function createDefaultCollections(mediaLibrary) {
    // Create collections for each media type
    const typeCollections = {
        'image': new MediaCollection('Images'),
        'video': new MediaCollection('Videos'),
        'audio': new MediaCollection('Audio'),
        'shape': new MediaCollection('3D Shapes')
    };

    // Create collections for each library
    const libraryCollections = new Map();
    mediaLibrary.forEach(mediaObj => {
        // Handle both forward and backslashes, split on either
        const urlParts = mediaObj.url.split(/[/\\]/);
        
        // Extract library name (should be the second part after 'library')
        const libraryIndex = urlParts.findIndex(part => part === 'library') + 1;
        const libraryName = urlParts[libraryIndex];
        
        if (libraryName) {
            // Create new collection for this library if it doesn't exist
            if (!libraryCollections.has(libraryName)) {
                libraryCollections.set(libraryName, new MediaCollection(libraryName));
            }
            
            // Add media to library collection
            libraryCollections.get(libraryName).add(mediaObj);
            
            // Also add to type collection
            const typeCollection = typeCollections[mediaObj.type];
            if (typeCollection) {
                typeCollection.add(mediaObj);
            }
        }
    });

    // Store all collections in the map
    Object.values(typeCollections).forEach(collection => {
        collections.set(collection.name, collection);
    });
    
    libraryCollections.forEach((collection, name) => {
        collections.set(name, collection);
    });
}

// Modify loadLibrary to create default collections
async function loadLibrary(jsonFilePath) {
    try {
        if (!jsonFilePath) {
            // Load all JSON files from the library directory
            const libraryPath = './library/';
            try {
                const indexResponse = await fetch(libraryPath + 'index.json');
                const index = await indexResponse.json();
                const files = index.files || [];
                
                console.log("Found library files:", files);
                
                for (const file of files) {
                    try {
                        await loadLibrary(libraryPath + file);
                        // Notify sidebar of loaded library
                        if (window.sidebar) {
                            window.sidebar.addLibrary(file);
                        }
                    } catch (error) {
                        console.warn(`Failed to load ${file}:`, error);
                        // Continue with other files even if one fails
                        continue;
                    }
                }
                
                // Create default collections even if some files failed to load
                createDefaultCollections(mediaLibrary);
                
                return mediaLibrary;
            } catch (error) {
                console.warn("Failed to load index.json, creating empty collections:", error);
                createDefaultCollections([]);
                return mediaLibrary;
            }
        }

        console.log("Loading library from:", jsonFilePath);
        const response = await fetch(jsonFilePath);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const jsonData = await response.json();
        console.log("JSON data parsed:", jsonData.length, "items");

        jsonData.forEach(path => {
            const mediaObj = new MediaObject(path);
            mediaLibrary.push(mediaObj);
        });

        return mediaLibrary;

    } catch (error) {
        console.warn("Failed to load library file:", error);
        throw error;
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
    return collections.get(name);
}

export { 
    MediaObject, 
    mediaLibrary, 
    loadLibrary,
    collections,
    createCollection,
    getCollection
};