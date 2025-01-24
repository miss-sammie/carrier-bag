import { MediaObject, mediaLibrary, getCollection } from './media.js';
import { reloadPatch } from './periphone.js';
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

    loadMedia(url) {
        // Remove any existing element
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    
        // Create new element based on media type
        const mediaObj = mediaLibrary.find(m => m.url === url);
        if (!mediaObj) {
            throw new Error(`Media not found in library: ${url}`);
        }
    
        // Create appropriate element
        switch (mediaObj.type) {
            case 'image':
                this.element = document.createElement('img');
                this.element.src = url;
                this.filetype = 'image';
                break;
    
            case 'video':
                this.element = document.createElement('video');
                this.element.src = url;
                this.element.loop = true;
                this.element.muted = true;
                this.element.autoplay = true;
                this.filetype = 'video';
                this.element.play()
                break;
    
            case 'audio':
                this.element = document.createElement('audio');
                this.element.src = url;
                this.filetype = 'audio';
                break;
    
            default:
                throw new Error(`Unsupported media type: ${mediaObj.type}`);
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
            Controls.timeShift(this.element, operation);
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

}



  export { Buffer };
  


