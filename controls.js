import { Buffer } from './buffers.js';
import { reloadPatch, reloadActiveSource, patches, switchCam, switchPatch } from './hydra.js';
import { MediaObject, mediaLibrary, getCollection, collections } from './media.js';
import { getPauseTime, setPauseTime } from './sheSpeaks.js';
//import monomeGrid from './lib/monome-grid-wrapper.js';

class Controls {
    static timeOperations = ['forward', 'backward', 'reset', 'random'];
    static speedOperations = ['faster', 'slower', 'normal'];
    static speeds = [0.25,0.5, 1, 2, 4];
    static switchOperations = ['next', 'prev', 'random'];
    static midiAccess = null;
    static midiInputs = [];
    static midiEnabled = false;
    static timeShiftInterval = 2
    static DEBUG = false;  // Debug flag - set to true to enable logging
    static gridEnabled = false;
    static grid = null;
    static led = [];
    static dirty = true;
    static ws = null;

    static keyMapping = {
        'Digit1': () => Controls.focus(0),
        'Digit2': () => Controls.focus(1),
        'Digit3': () => Controls.focus(2),
        'Digit4': () => Controls.focus(3),
        'KeyQ': () => Controls.switchFile('prev'),
        'KeyW': () => Controls.switchFile('next'),
        'KeyE': () => Controls.switchFile('random'),
        'KeyR': () => Controls.switchCollection('next'),
        'KeyA': () => Controls.timeShift('backward'),
        'KeyS': () => Controls.timeShift('forward'),
        'KeyD': () => Controls.timeShift('random'),
        'KeyX': () => Controls.speedShift('faster'),
        'KeyZ': () => Controls.speedShift('slower'),
        'KeyC': () => Controls.speedShift('normal'),
        'KeyV': () => switchCam(),
        'KeyB': () => switchPatch(),
        'KeyT': () => Controls.switchCollection('prev'),
        'KeyY': () => Controls.switchCollection('random'),
    };

    static midiMapping = {
        60: () => Controls.focus(0), // C4
        61: () => Controls.focus(1), // C#4
  //      62: () => Controls.focus(2), // D4
     //   63: () => Controls.focus(3), // D#4
        64: () => Controls.switchFile('prev'), // E4
        65: () => Controls.switchFile('next'), // F4
        66: () => Controls.switchFile('random'), // F#4
        67: () => Controls.timeShift('backward'), // G4
        68: () => Controls.timeShift('forward'), // G#4
        69: () => Controls.timeShift('random'), // A4
        70: () => Controls.speedShift('slower'), // B4
        71: () => Controls.speedShift('faster'), // C5
        72: () => Controls.speedShift('normal'), // C#5
      //  73: () => Controls.switchCollection('prev'),
        //74: () => Controls.switchCollection('next'),
      //  75: () => Controls.switchCollection('random'),
    };

    static autoIntervals = {
        switch: null,
        time: null,
        speed: null
    };

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
    static ccState = {};

    static midiCCMapping = {
        42: (value) => {
            const pauseTime = Math.floor((value / 127) * 3999) + 1;
            setPauseTime(pauseTime);
        },
        37: (value) => {    
            //switch patch  
            const patcharray = Object.keys(patches);
            const nextPatch = Math.floor((value / 127) * patcharray.length) + 1;
            console.log(nextPatch)
            reloadPatch(nextPatch);
        },
        38: (value) => {
            //speed shift
            if (value < 54) {
                const normalizedValue = value / 54;
                const speed = 0.25 + (normalizedValue * 0.75);
                Controls.speedShift(speed);
            } else if (value > 74) {
                const normalizedValue = (value - 74) / (127 - 74);
                const speed = 1 + (normalizedValue * 7);
                Controls.speedShift(speed);
            } else {
                Controls.speedShift(1);
            }
        },
        39: (value) => {
            //time shift
            if (value < 54) {
                const normalizedValue = value / 54;
                const interval = Math.floor(1000 + normalizedValue * 4000);
                Controls.timeShift('backward');
                Controls.createAutoInterval('time', () => Controls.timeShift('backward'), interval);
            } else if (value > 74) {
                const normalizedValue = (value - 74) / (127 - 74);
                const interval = Math.floor(5000 - normalizedValue * 4000);
                Controls.timeShift('forward');
                Controls.createAutoInterval('time', () => Controls.timeShift('forward'), interval);
            } else {
                Controls.clearAutoInterval('time');
            }
        },
        40: (value) => {
            //time shift interval
            const timeShiftIntervalRange = Math.floor((value / 127) * 9) + 1; // This gives range 1-10
            Controls.timeShiftInterval = timeShiftIntervalRange;
            console.log(Controls.timeShiftInterval);
        },
        41: (value) => {
            //switch file 
            const focusedBuffer = Buffer.buffers.find(b => b.focus);
            const collection = focusedBuffer.currentCollection.items;
            const nextFileIndex = Math.floor((value / 127) * (collection.length - 1));
            console.log('MIDI value:', value, 'Next index:', nextFileIndex);
            focusedBuffer.loadMedia(collection[nextFileIndex].url);
            console.log(collection[nextFileIndex].url)
            reloadActiveSource();
        }
    };

    static gridMapping = {
        // Bottom row (y=7) for buffer focus
        '7,0': () => Controls.focus(0),
        '7,1': () => Controls.focus(1),
      //  '7,2': () => Controls.focus(2),
      //  '7,3': () => Controls.focus(3),
        
        // Row 6 for file switching
        '6,0': () => Controls.switchFile('prev'),
        '6,1': () => Controls.switchFile('next'),
        '6,2': () => Controls.switchFile('random'),
        
        // Row 5 for time operations
        '5,0': () => Controls.timeShift('backward'),
        '5,1': () => Controls.timeShift('forward'),
        '5,2': () => Controls.timeShift('random'),
        
        // Row 4 for speed operations
        '4,0': () => Controls.speedShift('slower'),
        '4,1': () => Controls.speedShift('faster'),
        '4,2': () => Controls.speedShift('normal'),
        
        // Row 3 for collection switching
        '3,0': () => Controls.switchCollection('prev'),
        '3,1': () => Controls.switchCollection('next'),
        '3,2': () => Controls.switchCollection('random'),
    };

    static init() {
        this.log('Starting Controls initialization...');
        
        // Keyboard initialization only
        Object.entries(this.keyMapping).forEach(([key, handler]) => {
            document.addEventListener('keyup', (event) => {
                if (event.code === key) {
                    handler();
                }
            });
        });

        this.log('Keyboard controls initialized');
    }

    static initializeMIDI() {
        console.log('Attempting MIDI initialization...');
        if (navigator.requestMIDIAccess) {
            console.log('Browser supports MIDI access');
            navigator.requestMIDIAccess()
                .then((access) => {
                    console.log('MIDI Access granted:', access);
                    this.onMIDISuccess(access);
                })
                .catch((error) => {
                    console.error('MIDI Access failed:', error);
                    this.onMIDIFailure(error);
                });
        } else {
            console.warn('Web MIDI API not supported in this browser.');
        }
    }

    static testMIDIInput() {
        if (!this.midiEnabled) {
            console.warn('MIDI is not enabled');
            return;
        }
    
        console.log('Current MIDI state:', {
            access: this.midiAccess,
            inputs: Array.from(this.midiAccess.inputs.values()),
            enabled: this.midiEnabled
        });
    }

    
    static onMIDISuccess = (midiAccess) => {
        console.log('MIDI access granted');
        const inputs = Array.from(midiAccess.inputs.values());
        console.log('Available MIDI inputs:', inputs);
        
        inputs.forEach(input => {
            console.log(`Setting up MIDI input: ${input.name}`);
            input.onmidimessage = this.handleMIDIMessage;
        });
    }

    static onMIDIFailure() {
        console.warn('Failed to access MIDI devices.');
    }

    static handleMIDIMessage(message) {
        const [status, note, velocity] = message.data;
        
        if (status === 144 && velocity > 0) { // Note on
            const handler = Controls.midiMapping[note];
            if (handler) {
                handler();
            }
        } else if (status === 176) { // Control Change (CC)
            // Create static object to store last values and timeouts for each CC
            Controls.ccState = Controls.ccState || {};
            Controls.ccState[note] = Controls.ccState[note] || { lastValue: null, timeout: null };
            
            // If value has changed, reset the timeout
            if (velocity !== Controls.ccState[note].lastValue) {
                Controls.ccState[note].lastValue = velocity;
                if (Controls.ccState[note].timeout) {
                    clearTimeout(Controls.ccState[note].timeout);
                }
                
                // Start a new timeout
                Controls.ccState[note].timeout = setTimeout(() => {
                    const handler = Controls.midiCCMapping[note];
                    if (handler) {
                        handler(velocity);
                    }
                }, 150);
            }
        }
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
        // Errors might be important enough to always log
        // Or you can make them conditional too
        if (this.DEBUG) {
            console.error(...args);
        }
    }

    static async switchFile(direction = 'next') {
        const focusedBuffer = Buffer.buffers.find(b => b.focus);
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
        const focusedBuffer = Buffer.buffers.find(b => b.focus);
        if (!focusedBuffer || !focusedBuffer.element || !['video', 'audio'].includes(focusedBuffer.filetype)) {
            this.warn('Cannot time shift: no valid media element');
            return;
        }
    
        const element = focusedBuffer.element;
        const duration = element.duration;
    
        // Ensure duration is valid before proceeding
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
                this.warn(`Invalid time shift operation: ${operation}`);
                return;
        }
    }

    static speedShift(speed) {
        const focusedBuffer = Buffer.buffers.find(b => b.focus);
        if (!focusedBuffer || !focusedBuffer.element || !['video', 'audio'].includes(focusedBuffer.filetype)) {
            this.warn('Cannot speed shift: no valid media element');
            return;
        }

        const element = focusedBuffer.element;

        if (typeof speed === 'number') {
            // Clamp speed between 0.25 and 8
            const clampedSpeed = Math.max(0.25, Math.min(8, speed));
            element.playbackRate = clampedSpeed;
            this.log(`Speed changed to ${clampedSpeed.toFixed(2)}x`);
        } else {
            // Handle existing string-based operations ('faster', 'slower', 'normal')
            const currentSpeed = element.playbackRate;
            const currentIndex = Controls.speeds.indexOf(currentSpeed);
            let newIndex;

            switch(speed) {
                case 'faster':
                    newIndex = Math.min(currentIndex + 1, Controls.speeds.length - 1);
                    break;
                case 'slower':
                    newIndex = Math.max(currentIndex - 1, 0);
                    break;
                case 'normal':
                    newIndex = Controls.speeds.indexOf(1);
                    break;
                default:
                    this.warn(`Invalid speed shift operation: ${speed}`);
                    return;
            }
            element.playbackRate = Controls.speeds[newIndex];
            this.log(`Speed changed to ${Controls.speeds[newIndex]}x`);
        }

        // Update sidebar if it exists
        if (window.sidebar) {
            window.sidebar.update();
        }
    }

    static switchPatch(patch) {
        reloadPatch(patch);
    }

    static togglePlay(element) {
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            console.warn('Cannot toggle play: invalid element');
            return;
        }

        if (element.paused) {
            element.play().catch(e => console.log('Play handled'));
        } else {
            element.pause();
        }
    }

    static toggleMute(element) {
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            console.warn('Cannot toggle mute: invalid element');
            return;
        }

        element.muted = !element.muted;
    }

    static focus(buffer) {
        Buffer.buffers.forEach(b => {
            if (b.focus) {
                b.focus = false;
            }
        });
        Buffer.buffers[buffer].focus = true;
        console.log(`Focused buffer ${buffer}`);
        this.dirty = true;  // Mark grid for update
    }

    static switchCollection(direction = 'next') {
        const focusedBuffer = Buffer.buffers.find(b => b.focus);
        if (!focusedBuffer) {
            this.warn('No buffer focused');
            return;
        }

        this.log(`Switching collection: ${direction}`);
        
        // Get array of collection names, filtering out empty collections
        const collectionNames = Array.from(collections.entries())
            .filter(([name, collection]) => collection.items.length > 0)
            .map(([name]) => name);

        if (collectionNames.length === 0) {
            this.warn('No non-empty collections available');
            return;
        }

        // Find current collection index
        const currentIndex = collectionNames.indexOf(focusedBuffer.currentCollection?.name);
        let newIndex;
        
        if (currentIndex === -1) {
            // If no current collection, start with the first one
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
                    // Ensure we don't get the same collection
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

    static async initializeGrid() {
        try {
            this.log('GRID: Attempting WebSocket connection...');
            this.ws = new WebSocket('ws://localhost:8080');

            this.ws.onopen = () => {
                this.log('WebSocket Connected to Grid');
                this.gridEnabled = true;

                // Initialize LED array
                for (let y = 0; y < 8; y++) {
                    this.led[y] = [];
                    for (let x = 0; x < 16; x++) {
                        this.led[y][x] = 0;
                    }
                }

                // Start the refresh loop
                this.startGridRefresh();
                this.log('Grid refresh loop started');
            };

            this.ws.onclose = () => {
                this.warn('WebSocket connection closed');
                this.gridEnabled = false;
            };

            this.ws.onerror = (error) => {
                this.error('WebSocket error:', error);
                this.gridEnabled = false;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'gridKey') {
                        this.handleGridPress(data.x, data.y, data.s);
                    }
                } catch (error) {
                    this.error('Error processing WebSocket message:', error);
                }
            };

        } catch (error) {
            this.log('Grid initialization skipped:', error);
            this.gridEnabled = false;
        }
    }

    static handleGridPress(x, y, s) {
        this.log('Handling grid press:', x, y, s);
        
        // Only handle button presses (s=1), not releases (s=0)
        if (s === 1) {
            const key = `${y},${x}`;
            const handler = this.gridMapping[key];
            
            if (handler) {
                this.log(`Executing grid command for ${key}`);
                handler();
                this.dirty = true;  // Mark grid for update
            }
        }
    }

    static startGridRefresh() {
        const refresh = () => {
            if (this.dirty && this.gridEnabled) {
                // Clear all LEDs
                for (let y = 0; y < 8; y++) {
                    this.led[y] = [];
                    for (let x = 0; x < 16; x++) {
                        this.led[y][x] = 0;
                    }
                }

                // Light up all mapped controls with mild brightness
                Object.keys(this.gridMapping).forEach(key => {
                    const [y, x] = key.split(',').map(Number);
                    this.led[y][x] = 4;  // mild brightness
                });

                // Draw focus slots on bottom row with appropriate brightness
                Buffer.buffers.forEach((buffer, index) => {
                    this.led[7][index] = buffer.focus ? 15 : 4;  // Bright for focused, dim for unfocused
                });

                // Update grid
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(JSON.stringify({
                        type: 'ledUpdate',
                        led: this.led
                    }));
                }
                this.dirty = false;
            }
            requestAnimationFrame(refresh);
        };

        refresh();
        this.log('Grid refresh loop started');
    }

    static cleanup() {
        if (this.gridEnabled && this.grid) {
            // Clear all LEDs
            const blankLed = Array(8).fill().map(() => Array(16).fill(0));
            this.grid.refresh(blankLed);
        }
    }
}

// Add event listener for cleanup
window.addEventListener('beforeunload', () => {
    Controls.cleanup();
});

export { Controls };