import { Buffer } from './buffers.js';
import { reloadPatch } from './periphone.js';
import { MediaObject, mediaLibrary, getCollection } from './media.js';


class Controls {
    static timeOperations = ['forward', 'backward', 'reset', 'random'];
    static speedOperations = ['faster', 'slower', 'normal'];
    static speeds = [0.25,0.5, 1, 2, 4];
    static switchOperations = ['next', 'prev', 'random'];
    static midiAccess = null;
    static midiInputs = [];
    static midiEnabled = false;
    static DEBUG = false;  // Debug flag - set to true to enable logging


    static keyMapping = {
        'Digit1': () => Controls.focus(0),
        'Digit2': () => Controls.focus(1),
        'Digit3': () => Controls.focus(2),
        'Digit4': () => Controls.focus(3),
        'KeyQ': () => Controls.switchFile('prev'),
        'KeyW': () => Controls.switchFile('next'),
        'KeyE': () => Controls.switchFile('random'),
        'KeyA': () => Controls.timeShift('backward'),
        'KeyS': () => Controls.timeShift('forward'),
        'KeyD': () => Controls.timeShift('random'),
        'KeyZ': () => Controls.speedShift('faster'),
        'KeyX': () => Controls.speedShift('slower'),
        'KeyC': () => Controls.speedShift('normal')
    
    };

    static midiMapping = {
        60: () => Controls.focus(0), // C4
        61: () => Controls.focus(1), // C#4
        62: () => Controls.focus(2), // D4
        63: () => Controls.focus(3), // D#4
        64: () => Controls.switchFile('prev'), // E4
        65: () => Controls.switchFile('next'), // F4
        66: () => Controls.switchFile('random'), // F#4
        67: () => Controls.timeShift('backward'), // G4
        68: () => Controls.timeShift('forward'), // G#4
        69: () => Controls.timeShift('random'), // A4
        70: () => Controls.speedShift('slower'), // B4
        71: () => Controls.speedShift('faster'), // C5
        72: () => Controls.speedShift('normal') // C#5
    };
    
    static init() {
        Object.entries(this.keyMapping).forEach(([key, handler]) => {
            document.addEventListener('keyup', (event) => {
                if (event.code === key) {
                    handler();
                }
            });
        });
        console.log('Controls initialized');
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
    static SWITCH_COOLDOWN = 500; // 500ms cooldown between switches

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
        
        if (this.switchInProgress) {
            this.log('Switch already in progress, ignoring request');
            return;
        }

        const now = Date.now();
        if ((now - this.lastSwitchTime) < this.SWITCH_COOLDOWN) {
            this.log(`Cooldown active, waiting ${this.SWITCH_COOLDOWN}ms between switches`);
            return;
        }

        this.log(`Starting switch file: ${direction}, last switch was ${now - this.lastSwitchTime}ms ago`);
        this.switchInProgress = true;
        this.lastSwitchTime = now;

        try {
            const focusedBuffer = Buffer.buffers.find(b => b.focus);
            if (!focusedBuffer) {
                this.warn('No buffer focused');
                return;
            }

            if (!focusedBuffer.currentCollection) {
                this.error('No collection set for this buffer');
                return;
            }

            const length = focusedBuffer.currentCollection.length;
            let newIndex;

            if (focusedBuffer.element) {
                const oldElement = focusedBuffer.element;
                // Remove from Hydra's sources based on slot
                switch(focusedBuffer.slot) {
                    case 0:
                        this.log('Clearing s1');
                        s1.clear();
                        break;
                    case 1:
                        this.log('Clearing s2');
                        s2.clear();
                        break;
                    case 2:
                        this.log('Clearing s3');
                        s3.clear();
                        break;
                    case 3:
                        this.log('Clearing s4');
                        s4.clear();
                        break;
                }
                
                // Clear the element

                if (oldElement instanceof HTMLMediaElement) {
                    // For video and audio elements
                    oldElement.pause();
                    oldElement.src = '';
                    oldElement.load();
                } else if (oldElement instanceof HTMLImageElement) {
                    // For image elements
                    oldElement.src = '';
                }
            }

            switch(direction) {
                case 'next':
                    newIndex = (focusedBuffer.currentIndex + 1) % length;
                    break;
                case 'prev':
                    newIndex = (focusedBuffer.currentIndex - 1 + length) % length;
                    break;
                case 'random':
                    do {
                        newIndex = Math.floor(Math.random() * length);
                    } while (length > 1 && newIndex === focusedBuffer.currentIndex);
                    break;
            }

            focusedBuffer.currentIndex = newIndex;
            const mediaObj = focusedBuffer.currentCollection[focusedBuffer.currentIndex];
            this.log(`Attempting to load: ${mediaObj.url}`);

            // Load the new media with promise-based error handling
            const element = await new Promise((resolve, reject) => {
                const el = focusedBuffer.loadMedia(mediaObj.url);
                
                if (!el) {
                    reject(new Error('No element returned from loadMedia'));
                    return;
                }

                if (focusedBuffer.filetype === 'video') {
                    this.log(`Setting up video listeners for ${mediaObj.url}`);
                    let loadTimeout = setTimeout(() => {
                        this.log(`Load timeout for ${mediaObj.url}`);
                        reject(new Error('Video load timeout'));
                    }, 5000);

                    el.preload = 'metadata';  // Only load metadata initially
                    el.playsInline = true;    // Optimize for in-browser playback
                    
                    el.addEventListener('loadeddata', () => {
                        clearTimeout(loadTimeout);
                        this.log(`Video loaded successfully: ${mediaObj.url}`);
                        resolve(el);
                    }, { once: true });

                    el.addEventListener('error', (e) => {
                        clearTimeout(loadTimeout);
                        this.error(`Video load error for ${mediaObj.url}:`, e.target?.error);
                        reject(new Error(`Failed to load video: ${mediaObj.url}`));
                    }, { once: true });
                } else {
                    resolve(el);
                }
            });

            // Handle successful media load
            if (focusedBuffer.filetype === 'video' && element) {
                try {
                    await element.play();
                    this.log(`Video playing: ${mediaObj.url}`);
                } catch (e) {
                    this.warn(`Auto-play failed: ${mediaObj.url}`, e);
                }
            }

            // Delay reload patch slightly to ensure media is ready
            setTimeout(() => reloadPatch(), 200);
            return element;

        } catch (error) {
            this.error(`Failed to load media:`, error);
        } finally {
            this.log('Switch complete, resetting flags');
            this.switchInProgress = false;
        }
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
                // Use modulo to wrap around if we exceed duration
                element.currentTime = (element.currentTime + 2) % duration;
                this.log(`Time shifted forward to ${element.currentTime.toFixed(2)}s`);
                break;
            case 'backward':
                // Add duration before modulo to handle negative values
                element.currentTime = ((element.currentTime - 2) + duration) % duration;
                this.log(`Time shifted backward to ${element.currentTime.toFixed(2)}s`);
                break;
            case 'reset':
                element.currentTime = 0;    
                this.log(`Time reset to 0`);
                break;
            case 'random':
                element.currentTime = Math.random() * duration;
                this.log(`Time shifted to random position: ${element.currentTime.toFixed(2)}s`);
                break;
            default:
                this.warn(`Invalid time shift operation: ${operation}`);
        }
    }

    static speedShift(operation) {
        const focusedBuffer = Buffer.buffers.find(b => b.focus);
        if (!focusedBuffer || !focusedBuffer.element || !['video', 'audio'].includes(focusedBuffer.filetype)) {
            this.warn('Cannot speed shift: no valid media element');
            return;
        }

        const element = focusedBuffer.element;
        const currentSpeed = element.playbackRate;
        const currentIndex = this.speeds.indexOf(currentSpeed);

        switch(operation) {
            case 'faster':
                if (currentIndex < this.speeds.length - 1) {
                    element.playbackRate = this.speeds[currentIndex + 1];
                    this.log(`Speed shifted faster to ${element.playbackRate}`);
                }
                break;
            case 'slower':
                if (currentIndex > 0) {
                    element.playbackRate = this.speeds[currentIndex - 1];
                    this.log(`Speed shifted slower to ${element.playbackRate}`);
                }
                break;
            case 'normal':
                element.playbackRate = 1;
                this.log(`Speed shifted to normal`);
                break;
            default:
                this.warn(`Invalid speed shift operation: ${operation}`);
        }
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
    }

    static init() {
        Object.entries(this.keyMapping).forEach(([key, handler]) => {
            document.addEventListener('keyup', (event) => {
                if (event.code === key) {
                    handler();
                }
            });
        });
        console.log('Controls initialized');
    }
}







export { Controls };