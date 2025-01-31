import { Buffer } from './buffers.js';
import { reloadPatch, reloadActiveSource } from './hydra.js';
import { MediaObject, mediaLibrary, getCollection } from './media.js';
import { getPauseTime, setPauseTime } from './sheSpeaks.js';


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

    static midiCCMapping = {
        37: (value) => { // CC 1
            const pauseTime = Math.floor((value / 127) * 3999) + 1;
            setPauseTime(pauseTime);
        },
        38: (value) => {
            if (value < 54) {
                // Map 0-54 to speeds between 0.25 and 1
                const normalizedValue = value / 54;
                const speed = 0.25 + (normalizedValue * 0.75); // 0.75 is the difference between 1 and 0.25
                Controls.speedShift(speed);
            } else if (value > 74) {
                // Map 74-127 to speeds between 1 and 8
                const normalizedValue = (value - 74) / (127 - 74);
                const speed = 1 + (normalizedValue * 7); // 7 is the difference between 8 and 1
                Controls.speedShift(speed);
            } else {
                // Center zone sets speed to 1
                Controls.speedShift(1);
            }
        },
        39: (value) => {
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
        40: (function() {
            let lastValue = null;
            return (value) => {
                if (value === lastValue) return;
                lastValue = value;

                if (value < 54) {
                    const normalizedValue = value / 54;
                    const interval = Math.floor(4000 + normalizedValue * 21000);
                    Controls.switchFile('prev');
                    Controls.createAutoInterval('switch', () => Controls.switchFile('prev'), interval);
                } else if (value > 74) {
                    const normalizedValue = (value - 74) / (127 - 74);
                    const interval = Math.floor(25000 - normalizedValue * 21000);
                    Controls.switchFile('next');
                    Controls.createAutoInterval('switch', () => Controls.switchFile('next'), interval);
                } else {
                    Controls.clearAutoInterval('switch');
                }
            };
        })()
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
        } else if (status === 176) { // Control Change (CC)
            const handler = Controls.midiCCMapping[note];
            if (handler) {
                handler(velocity);
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
                do {
                    newIndex = Math.floor(Math.random() * length);
                } while (length > 1 && newIndex === focusedBuffer.currentIndex);
                break;
        }

        try {
            focusedBuffer.currentIndex = newIndex;
            await focusedBuffer.loadMedia(collection[newIndex].url);
            reloadActiveSource();
        } catch (error) {
            console.error('Failed to load media:', error);
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
    
        // Store whether the element was playing before the time shift
        const wasPlaying = !element.paused;
    
        switch(operation) {
            case 'forward':
                element.currentTime = (element.currentTime + 2) % duration;
                this.log(`Time shifted forward to ${element.currentTime.toFixed(2)}s`);
                break;
            case 'backward':
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
                return;
        }

        // Resume playback if it was playing before
      //  if (wasPlaying) {
            element.play()
            //.catch(e => this.warn('Could not resume playback:', e));
      //  }

        // Reload Hydra source to reflect the changes
        reloadActiveSource();
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