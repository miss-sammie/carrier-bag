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
            throw new Error(`Collection "${collectionName}" not found`);
        }

        this.currentCollection = collection;
        this.currentIndex = 0;

        console.log(`Buffer ${this.slot} set to collection "${collectionName}"`);
        
        // Load the first item
        return this.loadMedia(collection.getAll()[0].url);
    }

    switchFile(direction = 'next') {
        return Controls.switchFile(this, direction);
    }

    async loadMedia(url) {
        // Find media object
        const mediaObj = this.currentCollection.items.find(m => m.url === url);
        if (!mediaObj) {
            throw new Error(`Media not found in library: ${url}`);
        }

        try {
            let needNewElement = false;
            
            // Check if we need to create a new element
            if (!this.element) {
                needNewElement = true;
            } else {
                // Check if we need a different type of element
                const currentTag = this.element.tagName.toLowerCase();
                const needsTag = mediaObj.type === 'video' ? 'video' : 
                               mediaObj.type === 'audio' ? 'audio' : 'img';
                needNewElement = currentTag !== needsTag;
            }

            // If we need a new element, create it
            if (needNewElement) {
                // Clean up old element if it exists
                if (this.element) {
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
                        throw new Error(`Unsupported media type: ${mediaObj.type}`);
                }

                // Only reload Hydra source if we created a new element and this buffer is focused
                if (this.focus) {
                    reloadActiveSource();
                }
            } else {
                // If reusing element, pause if it's a media element
                if (this.filetype === 'video' || this.filetype === 'audio') {
                    this.element.pause();
                }
            }

            // Update the source
            this.element.src = url;
            
            // Start playing immediately for time-based media
            if (this.filetype === 'video' || this.filetype === 'audio') {
                this.element.currentTime = 0;
                this.element.play();
            }

            return this.element;
        } catch (error) {
            console.warn('Media load failed:', error);
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
  


