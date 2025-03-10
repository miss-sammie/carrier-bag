import { Buffer } from './buffers.js';
import { reloadPatch, reloadActiveSource, patches } from './hydra.js';
import { MediaObject, mediaLibrary, getCollection, collections, checkLibrary, fetchRemoteMedia } from './media.js';
import { getPauseTime, setPauseTime, initializeTextOverlay, toggleOverlay, toggleConsole } from './sheSpeaks.js';
//import monomeGrid from './lib/monome-grid-wrapper.js';

export class Controls {
    static timeOperations = ['forward', 'backward', 'reset', 'random'];
    static speedOperations = ['faster', 'slower', 'normal'];
    static speeds = [0.25,0.5, 1, 2, 4];
    static switchOperations = ['next', 'prev', 'random'];
    static timeShiftInterval = 2
    static noEnabled = true  
    static DEBUG = true; 

    static autoIntervals = {
        switch: null,
        time: null,
        speed: null
    }

    static createAutoInterval(type, callback, interval) {
        // Clear existing interval of this type if it exists
        if (this.autoIntervals[type]) {
            clearInterval(this.autoIntervals[type]);
            this.autoIntervals[type] = null;
            this.log(`Auto-${type} interval stopped`);
        }

        // Create new interval if valid interval provided
        if (typeof interval === 'number') {
            // Add a small delay before starting the interval
            setTimeout(() => {
                // Only create the interval if it hasn't been cleared during the delay
                if (!this.autoIntervals[type]) {
                    this.autoIntervals[type] = setInterval(callback, interval);
                    this.log(`Auto-${type} interval started: ${interval}ms`);
                }
            }, 150); // 150ms delay
        }
    }

    static clearAutoInterval(type) {
        if (this.autoIntervals[type]) {
            clearInterval(this.autoIntervals[type]);
            this.autoIntervals[type] = null;
            this.log(`Auto-${type} interval stopped`);
        }
    }

    static init() {
        this.log('Starting Controls initialization...');
        this.log('Controls initialized');
    }

    static get focusedBuffer() {
        return Buffer.buffers.find(b => b.focus);
    }
    
    static get currentCollection() {
        const buffer = this.focusedBuffer;
        return buffer ? buffer.currentCollection : null;
    }
    
    static set currentIndex(newIndex) {
        const buffer = this.focusedBuffer;
        if (buffer && buffer.currentCollection) {
            const length = buffer.currentCollection.length;
            buffer.currentIndex = ((newIndex % length) + length) % length;  // Ensures positive wraparound
        }
    }
    
    static switchInProgress = false;
    static lastSwitchTime = 0;
    static SWITCH_COOLDOWN = 200; // 500ms cooldown between switches

    static log(...args) {
        if (this.DEBUG) {
            console.log(...args);
        }
    }

    static warn(...args) {
        if (this.DEBUG) {
            console.warn(...args);
        }
    }

    static error(...args) {
        if (this.DEBUG) {
            console.error(...args);
        }
    }

    static async switchFile(direction = 'next') {
        const focusedBuffer = this.focusedBuffer;
        if (!focusedBuffer) {
            this.warn('No buffer focused');
            return;
        }
    
        if (!focusedBuffer.currentCollection) {
            this.error('No collection set for this buffer');
            return;
        }

        const collection = focusedBuffer.currentCollection.items;
        const length = collection.length;
        let newIndex;
        
        switch(direction) {
            case 'next':
                newIndex = (focusedBuffer.currentIndex + 1) % length;
                break;
            case 'prev':
                newIndex = (focusedBuffer.currentIndex - 1 + length) % length;
                break;
            case 'random':
                    newIndex = Math.floor(Math.random() * length);
                break;
        }

            focusedBuffer.currentIndex = newIndex;
        focusedBuffer.loadMedia(collection[newIndex].url);
    }
    
    static timeShift(operation) {
        const focusedBuffer = this.focusedBuffer;
        if (!focusedBuffer?.element || !['video', 'audio'].includes(focusedBuffer.filetype)) {
            this.warn('Cannot time shift: no valid media element');
            return;
        }
    
        const element = focusedBuffer.element;
        const duration = element.duration;
    
        if (!duration || isNaN(duration)) {
            this.warn('Cannot time shift: invalid duration');
            return;
        }
    
        switch(operation) {
            case 'forward':
                element.currentTime = (element.currentTime + this.timeShiftInterval) % duration;
                break;
            case 'backward':
                element.currentTime = ((element.currentTime - this.timeShiftInterval) + duration) % duration;
                break;
            case 'reset':
                element.currentTime = 0;    
                break;
            case 'random':
                element.currentTime = Math.floor(Math.random() * duration);
                break;
            default:
                // If operation is a number between 0 and 1, use it as a position
                if (typeof operation === 'number' && operation >= 0 && operation <= 1) {
                    element.currentTime = operation * duration;
                } else {
                    this.warn(`Invalid time shift operation: ${operation}`);
                }
        }
    }

    static speedShift(speed) {
        const focusedBuffer = this.focusedBuffer;
        if (!focusedBuffer?.element || !['video', 'audio'].includes(focusedBuffer.filetype)) {
            this.warn('Cannot speed shift: no valid media element');
            return;
        }

        const element = focusedBuffer.element;

        if (typeof speed === 'number') {
            const clampedSpeed = Math.max(0.25, Math.min(8, speed));
            element.playbackRate = clampedSpeed;
            this.log(`Speed changed to ${clampedSpeed}x`);
        } else {
            const currentSpeed = element.playbackRate;
            const currentIndex = this.speeds.indexOf(currentSpeed);
            let newIndex;

            switch(speed) {
                case 'faster':
                    newIndex = Math.min(currentIndex + 1, this.speeds.length - 1);
                    break;
                case 'slower':
                    newIndex = Math.max(currentIndex - 1, 0);
                    break;
                case 'normal':
                    newIndex = this.speeds.indexOf(1);
                    break;
                case 'random':
                    newIndex = Math.floor(Math.random() * this.speeds.length);
                    break;

                default:
                    this.warn(`Invalid speed shift operation: ${speed}`);
                    return;
            }
            element.playbackRate = this.speeds[newIndex];
            this.log(`Speed changed to ${this.speeds[newIndex]}x`);
        }
    }

    static switchCam() {
        if (!window.Devices?.webcams?.length) {
            this.warn('No webcams available');
            return;
        }
        
        const previousCam = window.currentCam;
        window.currentCam = (window.currentCam + 1) % window.Devices.webcams.length;
        
        // Reload the camera source in Hydra
        reloadActiveSource('cam');
        this.log(`Switched camera from ${previousCam} to ${window.currentCam}`);
        
        return window.currentCam;
    }

    static switchPatch(operation = 'next') {
        const patchArray = Object.keys(patches);
        const currentIndex = patchArray.indexOf(window.currentPatch?.toString());
        let nextIndex;

        if (typeof operation === 'number') {
            // Direct index selection (used by CC)
            nextIndex = Math.min(Math.max(0, operation - 1), patchArray.length - 1);
        } else {
            // Handle string-based operations
            switch(operation) {
                case 'next':
                    nextIndex = (currentIndex + 1) % patchArray.length;
                    break;
                case 'prev':
                    nextIndex = (currentIndex - 1 + patchArray.length) % patchArray.length;
                    break;
                case 'random':
                    do {
                        nextIndex = Math.floor(Math.random() * patchArray.length);
                    } while (nextIndex === currentIndex && patchArray.length > 1);
                    break;
                default:
                    // If operation is a patch name, try to find its index
                    const namedIndex = patchArray.indexOf(operation);
                    if (namedIndex !== -1) {
                        nextIndex = namedIndex;
                    } else {
                        this.warn(`Invalid patch operation: ${operation}`);
                        return;
                    }
            }
        }

        reloadPatch(patchArray[nextIndex]);
        this.log(`Switched to patch ${patchArray[nextIndex]}`);
    }

    static async refreshLibrary() {
        const newMediaInFolders = await checkLibrary(['uploads']);
        console.log(`Found ${newMediaInFolders.length} new files in specified folders`);
    }

    static async downloadRemoteMedia() {
        // First, fetch the remote media information
        const remoteItems = await fetchRemoteMedia(
            'https://temporary-archive.site', 
            '/api/media?directory=water%20drop', 
            {
                mode: 'cors'
            }, 
            'uploads'
        );
        
        console.log(`Found ${remoteItems.length} files from remote source`);
        
        // To actually download files, you would need a server-side endpoint
        // that can receive the files and save them to your local filesystem
        if (remoteItems.length > 0) {
            try {
                const downloadRequest = await fetch('/api/download-remote-files', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        urls: remoteItems.map(item => item.url),
                        targetFolder: 'uploads'
                    })
                });
                
                if (!downloadRequest.ok) {
                    throw new Error(`Download failed: ${downloadRequest.status}`);
                }
                
                const result = await downloadRequest.json();
                console.log(`Downloaded ${result.downloadedCount} files to local uploads folder`);
                
                // Refresh local library to see the new files
                await this.refreshLibrary();
                
            } catch (err) {
                console.error("Error downloading remote files:", err);
            }
        }
        
        return remoteItems;
    }

    static togglePlay() {
        const element = this.focusedBuffer?.element;
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            this.warn('Cannot toggle play: invalid element');
            return;
        }

        if (element.paused) {
            element.play().catch(e => this.log('Play handled'));
        } else {
            element.pause();
        }
    }

    static toggleMute() {
        const element = this.focusedBuffer?.element;
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            this.warn('Cannot toggle mute: invalid element');
            return;
        }

        element.muted = !element.muted;
    }

    static focus(buffer) {
        // If buffer is undefined, cycle to next buffer
        if (buffer === undefined) {
            const currentFocusIndex = Buffer.buffers.findIndex(b => b.focus);
            buffer = (currentFocusIndex === -1) ? 0 : (currentFocusIndex + 1) % Buffer.buffers.length;
        }

        // Clear focus from all buffers
        Buffer.buffers.forEach(b => b.focus = false);
        
        // Set focus on the selected buffer
        Buffer.buffers[buffer].focus = true;
        this.log(`Focused buffer ${buffer}`);
        
        // Mark grid for update if connected
        if (window.Devices?.gridEnabled) {
            window.Devices.dirty = true;
        }
    }

    static switchCollection(direction = 'next') {
        const focusedBuffer = this.focusedBuffer;
        if (!focusedBuffer) {
            this.warn('No buffer focused');
            return;
        }

        this.log(`Switching collection: ${direction}`);
        
        const collectionNames = Array.from(collections.entries())
            .filter(([name, collection]) => collection.items.length > 0)
            .map(([name]) => name);

        if (collectionNames.length === 0) {
            this.warn('No non-empty collections available');
            return;
        }

        const currentIndex = collectionNames.indexOf(focusedBuffer.currentCollection?.name);
        let newIndex;
        
        if (currentIndex === -1) {
            newIndex = 0;
        } else {
            switch(direction) {
                case 'next':
                    newIndex = (currentIndex + 1) % collectionNames.length;
                    break;
                case 'prev':
                    newIndex = (currentIndex - 1 + collectionNames.length) % collectionNames.length;
                    break;
                case 'random':
                    do {
                        newIndex = Math.floor(Math.random() * collectionNames.length);
                    } while (newIndex === currentIndex && collectionNames.length > 1);
                    break;
                default:
                    this.warn(`Invalid direction: ${direction}`);
                    return;
            }
        }

        const newCollectionName = collectionNames[newIndex];
        this.log(`Switching to collection: ${newCollectionName}`);
        
        try {
            focusedBuffer.setCollection(newCollectionName);
            reloadActiveSource();
        } catch (error) {
            this.error('Failed to switch collection:', error);
        }
    }

    static toggleOverlay() {
        // First check if we need to switch from popup to overlay mode/
        toggleOverlay();
    }

    static toggleConsole() {
        toggleConsole();
    }

    static toggleTextColor(color = null) {
        if (window.TextController) {
            window.TextController.toggleTextColor(color);
            this.log('Text color updated');
        } else {
            this.warn('TextController not available');
        }
    }

    static no() {
        if(this.noEnabled) {
            setTimeout(toggleOverlay(), 3000);
            console.error('NO!!');
            this.log('NO command received - paused all media and toggled overlay');
        }
    }

    static setPauseTime(time) {
        setPauseTime(time);
    }

    static async refreshRemoteLibrary() {
        try {
            // Fetch the list of remote media items
            const response = await fetch('/api/fetch-remote-media', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    remoteUrl: 'https://temporary-archive.site',
                    endpoint: '/api/media?directory=water%20drop',
                    targetFolder: 'uploads'
                })
            });
            
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`Downloaded ${result.downloadedCount} files to uploads folder`);
            
            // Refresh local library to see the new files
            await this.refreshLibrary();
            
            return result.downloadedFiles;
        } catch (err) {
            console.error("Error downloading remote media:", err);
            return [];
        }
    }

    static async switchFileByType(filters = {}) {
        const focusedBuffer = this.focusedBuffer;
        if (!focusedBuffer) {
            this.warn('No buffer focused');
            return;
        }

        // Get all media items from the entire library
        const allMedia = mediaLibrary;
        if (!allMedia || allMedia.length === 0) {
            this.warn('Media library is empty');
            return;
        }

        // Filter media based on provided criteria
        let filteredMedia = [...allMedia]; // Start with all media

        // Filter by type if specified
        if (filters.type) {
            const type = filters.type.toLowerCase();
            filteredMedia = filteredMedia.filter(media => 
                media.type && media.type.toLowerCase() === type
            );
        }

        // Filter by folder if specified
        if (filters.folder) {
            const folder = filters.folder.toLowerCase();
            filteredMedia = filteredMedia.filter(media => 
                media.folder && media.folder.toLowerCase() === folder
            );
        }

        // Filter by filename if specified (contains search, case insensitive)
        if (filters.filename) {
            const filename = filters.filename.toLowerCase();
            filteredMedia = filteredMedia.filter(media => 
                media.title && media.title.toLowerCase().includes(filename)
            );
        }

        // Check if we have any matches
        if (filteredMedia.length === 0) {
            this.warn(`No media matches the filters: ${JSON.stringify(filters)}`);
            return;
        }

        // Select a random item from the filtered results
        const randomIndex = Math.floor(Math.random() * filteredMedia.length);
        const selectedMedia = filteredMedia[randomIndex];

        // Load the selected media directly
        this.log(`Switching to media: ${selectedMedia.title} (${selectedMedia.type}) from folder: ${selectedMedia.folder}`);
        
        // If the buffer has a collection, try to find the media in it and update the index
        if (focusedBuffer.currentCollection) {
            const collectionIndex = focusedBuffer.currentCollection.items.findIndex(
                media => media.url === selectedMedia.url
            );
            
            if (collectionIndex !== -1) {
                focusedBuffer.currentIndex = collectionIndex;
                this.log(`Media found in current collection at index ${collectionIndex}`);
            } else {
                this.log(`Media not found in current collection, loading directly`);
            }
        }
        
        return focusedBuffer.loadMedia(selectedMedia.url);
    }
}

// Make Controls available globally
window.Controls = Controls;

// Remove grid-related cleanup
window.addEventListener('beforeunload', () => {
    // Any remaining cleanup if needed
});