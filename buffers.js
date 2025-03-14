import { MediaObject, mediaLibrary, getCollection } from './media.js';
import { reloadPatch, reloadActiveSource } from './hydra.js';
import { Controls } from './controls.js';


class Buffer {
    constructor(type, slot) {
        this.type = type;
        this.filetype = null // 'visual' or 'audio'
        this.url = null;
        this.active = false;
        this.focus = false;
        this.slot = slot;
        this.element = null;
        this.currentCollection = null;  // Add this
        this.currentIndex = -1;         // Add this to track position in collection
    }

    static buffers = [];

    static initBuffers(visualCount, audioCount) {
        // Clear existing buffers
        Buffer.buffers = [];
        
        // Initialize visual buffers
        for (let i = 0; i < visualCount; i++) {
            Buffer.buffers.push(new Buffer('visual', i));
        }
        
        // Initialize audio buffers
        for (let i = visualCount; i < visualCount + audioCount; i++) {
            Buffer.buffers.push(new Buffer('audio', i));
        }
        
        return Buffer.buffers;
    }
    
    setCollection(collectionName) {
        const collection = getCollection(collectionName);
        if (!collection) {
            console.error(`Collection "${collectionName}" not found`);
            throw new Error(`Collection "${collectionName}" not found`);
        }

        this.currentCollection = collection;
        this.currentIndex = 0;

        console.log(`Buffer ${this.slot} (${this.type}) set to collection "${collectionName}" with ${collection.items.length} items`);
        
        // Get all items from the collection
        const allItems = collection.getAll();
        
        // Filter items based on buffer type
        let compatibleItems;
        if (this.type === 'audio') {
            // For audio buffers, only include audio files
            compatibleItems = allItems.filter(item => item.type === 'audio');
            console.log(`Buffer ${this.slot} (audio): Found ${compatibleItems.length} compatible audio items in collection "${collectionName}"`);
        } else if (this.type === 'visual') {
            // For visual buffers, only include image and video files
            compatibleItems = allItems.filter(item => item.type === 'image' || item.type === 'video');
            console.log(`Buffer ${this.slot} (visual): Found ${compatibleItems.length} compatible visual items in collection "${collectionName}"`);
        } else {
            // Fallback to all items if buffer type is unknown
            compatibleItems = allItems;
        }
        
        // If no compatible items found, log a warning but don't throw an error
        if (compatibleItems.length === 0) {
            console.warn(`No compatible media found in collection "${collectionName}" for buffer type "${this.type}"`);
            return null;
        }
        
        // Load the first compatible item
        return this.loadMedia(compatibleItems[0].url);
    }

    switchFile(direction = 'next') {
        return Controls.switchFile(this, direction);
    }

    async loadMedia(url) {
        // Try to find media by URL first
        const mediaItem = mediaLibrary.find(item => item.url === url);
        
        if (!mediaItem) {
            console.warn(`Media not found in library by URL: ${url}`);
            
            // Try to find by filename as fallback
            const filename = url.split('/').pop();
            const mediaByFilename = mediaLibrary.find(item => 
                item.url.split('/').pop() === filename
            );
            
            if (mediaByFilename) {
                console.log(`Found media by filename instead: ${mediaByFilename.url}`);
                url = mediaByFilename.url;
            } else {
                // Try collection index fallback
                console.log("Falling back to collection index method");
                // Your existing fallback code
            }
        }
        
        // Find media object in the current collection
        let mediaObj = null;
        
        if (this.currentCollection && this.currentCollection.items) {
            mediaObj = this.currentCollection.items.find(m => m.url === url);
        }
        
        // If not found in the collection, search the entire library
        if (!mediaObj) {
            mediaObj = mediaLibrary.find(m => m.url === url);
            
            if (!mediaObj) {
                console.error(`Media not found in library: ${url}`);
                throw new Error(`Media not found in library: ${url}`);
            }
            
            // Optionally add to current collection for future reference
            if (this.currentCollection) {
                this.currentCollection.items.push(mediaObj);
                this.currentIndex = this.currentCollection.items.length - 1;
            }
        }

        try {
            console.log(`[Buffer ${this.slot}] Loading media:`, {
                url,
                type: mediaObj.type,
                currentElement: this.element?.tagName,
                collection: this.currentCollection?.name
            });

            let needNewElement = false;
            
            // Check if we need to create a new element
            if (!this.element) {
                console.log(`[Buffer ${this.slot}] No existing element, creating new one`);
                needNewElement = true;
            } else {
                // Check if we need a different type of element
                const currentTag = this.element.tagName.toLowerCase();
                const needsTag = mediaObj.type === 'video' ? 'video' : 
                               mediaObj.type === 'audio' ? 'audio' : 'img';
                needNewElement = currentTag !== needsTag;
                console.log(`[Buffer ${this.slot}] Element type check:`, {
                    currentTag,
                    needsTag,
                    needNewElement
                });
            }

            // If we need a new element, create it
            if (needNewElement) {
                // Clean up old element if it exists
                if (this.element) {
                    console.log(`[Buffer ${this.slot}] Cleaning up old element:`, this.element.tagName);
                    if (this.element.tagName === 'VIDEO' || this.element.tagName === 'AUDIO') {
                        this.element.pause();
                        this.element.src = '';
                    }
                    this.element = null;
                }

                // Create appropriate element
                switch (mediaObj.type) {
                    case 'image':
                        this.element = document.createElement('img');
                        this.filetype = 'image';
                        break;

                    case 'video':
                        this.element = document.createElement('video');
                        this.element.loop = true;
                        this.element.muted = true;
                        this.filetype = 'video';
                        break;

                    case 'audio':
                        this.element = document.createElement('audio');
                        this.element.preload = 'auto';
                        this.filetype = 'audio';
                        break;

                    default:
                        console.error(`[Buffer ${this.slot}] Unsupported media type:`, mediaObj.type);
                        throw new Error(`Unsupported media type: ${mediaObj.type}`);
                }

                console.log(`[Buffer ${this.slot}] Created new element:`, {
                    type: this.filetype,
                    element: this.element.tagName
                });

                // Only reload Hydra source if we created a new element and this buffer is focused
                if (this.focus) {
                    console.log(`[Buffer ${this.slot}] Reloading active source (buffer is focused)`);
                    reloadActiveSource();
                }
            } else {
                // If reusing element, pause if it's a media element
                if (this.filetype === 'video' || this.filetype === 'audio') {
                    console.log(`[Buffer ${this.slot}] Pausing existing media element`);
                    this.element.pause();
                }
            }

            // Update the source
            console.log(`[Buffer ${this.slot}] Setting source:`, url);
            this.element.src = url;
            
            // Start playing immediately for time-based media
            if (this.filetype === 'video' || this.filetype === 'audio') {
                this.element.currentTime = 0;
                console.log(`[Buffer ${this.slot}] Attempting to play media`);
                this.element.play().catch(error => {
                    console.error(`[Buffer ${this.slot}] Play failed:`, error);
                });
            }

            return this.element;
        } catch (error) {
            console.error(`[Buffer ${this.slot}] Media load failed:`, error);
            return null;
        }
    }

    play() {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            this.element.play();
        }
    }

    pause() {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            this.element.pause();
        }
    }

    timeShift(operation) {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            Controls.timeShift(operation);
        }
    }

    speedShift(operation) {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            Controls.speedShift(this.element, operation);
        }
    }

    togglePlay() {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            Controls.togglePlay(this.element);
        }
    }

    toggleMute() {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            Controls.toggleMute(this.element);
        }
    }

    clearCollection() {
        this.currentCollection = null;
        this.currentIndex = -1;
    }

    // updateUI() {
    //     const component = window.ui.components.get(`${this.slot}-0`); // Use the global UIGrid instance
    //     if (component) {
    //         component.update();
    //     }
    // }

    async loadHTMLElement(elementOrId) {
        let element;
        
        if (typeof elementOrId === 'string') {
            // If a string is passed, treat it as an ID
            element = document.getElementById(elementOrId);
            if (!element) {
                throw new Error(`Element with id "${elementOrId}" not found`);
            }
        } else if (elementOrId instanceof HTMLElement) {
            // If an HTML element is passed, use it directly
            element = elementOrId;
        } else {
            throw new Error('Invalid input: must be an element ID or HTML Element');
        }

        // Clean up existing element if any
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.element = element;
        this.filetype = 'html';
        this.url = null;
        this.currentCollection = null;
        this.currentIndex = -1;

        //this.updateUI();
        return this.element;
    }

    // Update cleanup method
    cleanup() {
        if (this.element) {
            if (this.element.tagName === 'VIDEO' || this.element.tagName === 'AUDIO') {
                this.element.pause();
                this.element.src = '';
            }
            this.element = null;
        }
    }
}

export { Buffer };
  


