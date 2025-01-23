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

    // Add each media object to its type collection
    mediaLibrary.forEach(mediaObj => {
        const collection = typeCollections[mediaObj.type];
        if (collection) {
            collection.add(mediaObj);
        }
    });

    // Store collections in the map
    Object.values(typeCollections).forEach(collection => {
        collections.set(collection.name, collection);
    });

    console.log("Default collections created:", 
        Array.from(collections.keys()),
        "\nCollection sizes:", 
        Array.from(collections.entries()).map(([name, coll]) => 
            `${name}: ${coll.items.length} items`
        )
    );
}

// Modify loadLibrary to create default collections
async function loadLibrary(jsonFilePath) {
    try {
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

        // Create default collections after loading
        createDefaultCollections(mediaLibrary);

        console.log("Library loaded:", {
            total: mediaLibrary.length,
            types: [...new Set(mediaLibrary.map(m => m.type))],
            firstItem: mediaLibrary[0],
            collections: Array.from(collections.keys())
        });

        return mediaLibrary;

    } catch (error) {
        console.error("Failed to load library:", error);
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