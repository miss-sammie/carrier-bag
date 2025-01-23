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
        // First remove any existing element from the DOM
        if (this.element && this.element.parentNode) {
            Controls.log(`Cleaning up existing element in slot ${this.slot}`);
        // Remove all event listeners
        this.element.onloadeddata = null;
        this.element.onerror = null;
        this.element.onended = null;
        this.element.onplay = null;
        this.element.onpause = null;

        // Stop any ongoing playback
        if (!this.element.paused) {
            this.element.pause();
        }

        // Reset source and clear source buffers
        this.element.removeAttribute('src');
        this.element.load(); // This triggers cleanup of media resources

        // Remove the element from DOM if it's there
        if (this.element.parentNode) {
            Controls.log(`Removing element from DOM in slot ${this.slot}`);
            this.element.parentNode.removeChild(this.element);
        }

        // Clear the reference
        this.element = null;
        Controls.log(`Cleanup complete for slot ${this.slot}`);
    
        }

        const mediaObj = mediaLibrary.find(m => m.url === url);
        if (!mediaObj) {
            throw new Error(`Media not found in library: ${url}`);
        }

        // Validate media type against buffer type
        if (this.type === 'audio' && mediaObj.type !== 'audio') {
            throw new Error(`Cannot load ${mediaObj.type} into audio buffer (slot ${this.slot})`);
        }
        if (this.type === 'visual' && !['image', 'video'].includes(mediaObj.type)) {
            throw new Error(`Cannot load ${mediaObj.type} into visual buffer (slot ${this.slot})`);
        }

        // Create new element based on media type
        switch (mediaObj.type) {
            case 'image':
                this.element = document.createElement('img');
                this.url = url
                this.element.src = url;
                this.filetype = 'image';
                console.log("Loaded image:", url);
                break;
            case 'video':
                this.element = document.createElement('video');
                this.url = url
                this.element.src = url;
                // Optional: add common video attributes
                //this.element.controls = true;
                this.filetype = 'video';
                this.element.autoplay = true;
                this.element.muted = true;
                this.element.loop = true;
                
                this.element.play()
                break;
            case 'audio':
                this.element = new Audio(url);
                // Optional: add common audio attributes
                //this.element.controls = true;
                this.filetype = 'audio';
                break;
            default:
                throw new Error(`Unsupported media type: ${mediaType}`);
        }

        // if (this.type === 'visual') {
        //    // document.body.appendChild(this.element)
        //     if(this.filetype === 'video') {
        //         this.element.play()
        //     }
        // }
        this.active = true
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
  


