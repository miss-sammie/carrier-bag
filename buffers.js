import { MediaObject, mediaLibrary, getCollection } from './media.js';
import { reloadPatch } from './hydra.js';
import { Controls } from './controls.js';
import { UIGrid, BufferStatusComponent } from './interface.js';


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
        
        // Filter collection based on buffer type
        const validMedia = collection.getAll().filter(item => {
            if (this.type === 'visual') {
                return ['image', 'video'].includes(item.type);
            } else if (this.type === 'audio') {
                return item.type === 'audio';
            }
            return false;
        });

        if (validMedia.length === 0) {
            throw new Error(`No compatible media in collection "${collectionName}"`);
        }

        this.currentCollection = validMedia;
        this.currentIndex = 0;
        console.log(`Buffer ${this.slot} set to collection "${collectionName}" with ${validMedia.length} items`);
        
        // Load the first item
        return this.loadMedia(this.currentCollection[0].url);
    }

    switchFile(direction = 'next') {
        return Controls.switchFile(this, direction);
    }

    async loadMedia(url) {
        // Create new element based on media type
        const mediaObj = mediaLibrary.find(m => m.url === url);
        if (!mediaObj) {
            throw new Error(`Media not found in library: ${url}`);
        }

        // Create appropriate element
        let newElement;
        switch (mediaObj.type) {
            case 'image':
                newElement = document.createElement('img');
                newElement.src = url;
                this.filetype = 'image';
                break;

            case 'video':
                newElement = document.createElement('video');
                newElement.src = url;
                newElement.loop = true;
                newElement.muted = true;
                newElement.autoplay = true;
                newElement.controls = true;
                newElement.play()
                this.filetype = 'video';
                break;

            case 'audio':
                newElement = document.createElement('audio');
                newElement.src = url;
                this.filetype = 'audio';
                break;

            default:
                throw new Error(`Unsupported media type: ${mediaObj.type}`);
        }

        // Wait for the new element to be ready
        await new Promise((resolve, reject) => {
            if (mediaObj.type === 'image') {
                newElement.onload = resolve;
                newElement.onerror = reject;
            } else {
                newElement.onloadeddata = resolve;
                newElement.onerror = reject;
            }
        });

        // Remove any existing element
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.element = newElement;

        // Add event listeners for dynamic updates
        if (this.element) {
            this.element.addEventListener('ratechange', () => {
                this.updateUI();
            });
            this.element.addEventListener('focus', () => {
                this.updateUI();
            });
            this.element.addEventListener('blur', () => {
                this.updateUI();
            });
        }

        return this.element;
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

    updateUI() {
        const component = window.ui.components.get(`${this.slot}-0`); // Use the global UIGrid instance
        if (component) {
            component.update();
        }
    }
}

export { Buffer };
  


