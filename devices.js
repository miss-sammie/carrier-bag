import { Controls } from './controls.js';
import { switchCam, patches, currentPatch, reloadActiveSource, reloadPatch } from './hydra.js';
import { Buffer } from './buffers.js';
import { collections } from './media.js';

export class Devices {
    static ws = null;
    static gridEnabled = false;
    static midiEnabled = false;
    static midiAccess = null;
    static led = [];
    static dirty = true;
    static playheadInterval = null;
    static webcams = [];
    static currentCam = 0;
    static cc = Array(128).fill(0.5);

    // Define grid mapping as a static property
    static gridMapping = {
        // File switching
        '6,0': () => Controls.switchFile('prev'),
        '6,1': () => Controls.switchFile('next'),
        '6,2': () => Controls.switchFile('random'),
        
        // Time operations
        '5,0': () => Controls.timeShift('backward'),
        '5,1': () => Controls.timeShift('forward'),
        '5,2': () => Controls.timeShift('random'),
        
        // Speed operations
        '4,0': () => Controls.speedShift('slower'),
        '4,1': () => Controls.speedShift('faster'),
        '4,2': () => Controls.speedShift('normal'),
        
        // Collection switching
        '3,0': () => Controls.switchCollection('prev'),
        '3,1': () => Controls.switchCollection('next'),
        '3,2': () => Controls.switchCollection('random'),

        // Patch switching
        '2,0': () => Controls.switchPatch('prev'),
        '2,1': () => Controls.switchPatch('next'),
        '2,2': () => Controls.switchPatch('random')
    };

    // Initialize all devices based on scene config
    static async init(config = { keyboard: true, midi: true, midicc: true, grid: true, speech: true }) {
        console.log('Initializing devices with config:', config);
        
        // Make Devices and cc array globally available immediately
        window.Devices = Devices;
        window.cc = this.cc;

        await this.initializeWebcams();
        
        if (config.keyboard) {
            this.initKeyboard();
        }
        
        if (config.midi || config.midicc) {
            await this.initializeMIDI(config.midicc);
        }
        
        if (config.grid) {
            await this.initializeGrid();
            this.setupDynamicGridControls();
        }

        if (config.speech) {
            this.initSpeechRecognition();
        }
    }

    static async initializeWebcams() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            console.log('Found video devices:', videoDevices);
            
            // Filter for USB cameras and built-in cameras
            this.webcams = videoDevices
                .map((device, index) => ({
                    index,
                    label: device.label.toLowerCase(),
                    isUSB: device.label.includes('USB') || device.label.includes('Camera')
                }))
                .filter(device => device.isUSB)
                .map(device => device.index);

            if (this.webcams.length === 0) {
                // If no USB cameras found, include all video devices
                this.webcams = videoDevices.map((_, index) => index);
            }

            console.log('Initialized webcams:', this.webcams);
            
            // Export webcams array to window for Hydra
            window.webcams = this.webcams;
            window.currentCam = this.currentCam;
            
        } catch (error) {
            console.error('Error initializing webcams:', error);
            // Fallback to default webcam array
            this.webcams = [0];
            window.webcams = this.webcams;
            window.currentCam = 0;
        }
    }

    // Internal method for managing webcam state
    static switchWebcam() {
        if (this.webcams.length === 0) return 0;
        this.currentCam = (this.currentCam + 1) % this.webcams.length;
        window.currentCam = this.currentCam;
        return this.currentCam;
    }

    // Keyboard handling
    static initKeyboard() {
        console.log('Initializing keyboard controls');
        const keyMapping = {
            'Digit1': () => Controls.focus(0),
            'Digit2': () => Controls.focus(1),
          //  'Digit3': () => Controls.focus(2),
           // 'Digit4': () => Controls.focus(3),
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
            'KeyV': () => Controls.switchCam(),
            'KeyB': () => Controls.switchPatch('next'),
            'KeyT': () => Controls.switchCollection('prev'),
            'KeyY': () => Controls.switchCollection('random'),
        };

        Object.entries(keyMapping).forEach(([key, handler]) => {
            document.addEventListener('keyup', (event) => {
                if (event.code === key) {
                    handler();
                }
            });
        });
    }

    // MIDI handling
    static async initializeMIDI(enableCC = true) {
        console.log('Initializing MIDI controls');
        if (!navigator.requestMIDIAccess) {
            console.warn('Web MIDI API not supported');
            return;
        }

        try {
            this.midiAccess = await navigator.requestMIDIAccess();
            this.midiEnabled = true;

            const inputs = Array.from(this.midiAccess.inputs.values());
            inputs.forEach(input => {
                input.onmidimessage = (message) => this.handleMIDIMessage(message, enableCC);
            });
            console.log('MIDI initialized successfully');
        } catch (error) {
            console.error('MIDI initialization failed:', error);
        }
    }

    static handleMIDIMessage(message, enableCC = true) {
        const [status, note, velocity] = message.data;
        
        // Handle CC messages
        if (status === 176 && enableCC) {
            // Update normalized CC value
            this.cc[note] = (velocity + 1) / 128.0;
            
            // Handle specific CC mappings
            switch(note) {
                case 42:
                    Controls.setPauseTime(Math.floor((this.cc[note] * 3999) + 1));
                    break;
                case 37: {
                    const patchArray = Object.keys(patches);
                    Controls.switchPatch(Math.floor((this.cc[note] * patchArray.length) + 1));
                    break;
                }
                case 38: {
                    const focusedBuffer = Controls.focusedBuffer;
                    if (!focusedBuffer) return;
                    const nonEmptyCollections = Array.from(collections.entries())
                        .filter(([name, collection]) => collection.items.length > 0)
                        .map(([name]) => name);
                    if (nonEmptyCollections.length === 0) return;
                    const index = Math.floor(this.cc[note] * nonEmptyCollections.length);
                    const newCollectionName = nonEmptyCollections[index];
                    if (newCollectionName !== focusedBuffer.currentCollection?.name) {
                        focusedBuffer.setCollection(newCollectionName);
                        reloadActiveSource();
                    }
                    break;
                }
                case 39: {
                    const val = this.cc[note] * 127;
                    if (val < 54) {
                        const normalizedValue = val / 54;
                        Controls.speedShift(0.25 + (normalizedValue * 0.75));
                    } else if (val > 74) {
                        const normalizedValue = (val - 74) / (127 - 74);
                        Controls.speedShift(1 + (normalizedValue * 7));
                    } else {
                        Controls.speedShift(1);
                    }
                    break;
                }
                case 40:
                    Controls.timeShift(this.cc[note]); // Already normalized 0-1
                    break;
                case 41: {
                    const focusedBuffer = Controls.focusedBuffer;
                    if (!focusedBuffer?.currentCollection) return;
                    const collection = focusedBuffer.currentCollection.items;
                    const length = collection.length;
                    if (length === 0) return;
                    const index = Math.floor(this.cc[note] * length);
                    focusedBuffer.currentIndex = index;
                    focusedBuffer.loadMedia(collection[index].url);
                    break;
                }
            }
        }
        
        // Handle note messages
        else if (status === 144 && velocity > 0) {
            const handler = {
                12: () => Controls.switchFile('prev'),
                11: () => Controls.switchFile('next'),
                23: () => Controls.focus(0),
                53: () => Controls.focus(1),
                60: () => Controls.focus(0),
                61: () => Controls.focus(1),
                29: () => {
                    Controls.focus(0)
                    Controls.speedShift('slower')
                },
                28: () => {
                    Controls.focus(0)
                    Controls.speedShift('faster')
                },
                59: () => {
                    Controls.focus(1)
                    Controls.speedShift('slower')
                },
                58: () => {
                    Controls.focus(1)
                    Controls.speedShift('faster')
                },
                64: () => Controls.switchFile('prev'),
                65: () => Controls.switchFile('next'),
                66: () => Controls.switchFile('random'),
                67: () => Controls.timeShift('backward'),
                68: () => Controls.timeShift('forward'),
                69: () => Controls.timeShift('random'),
                70: () => Controls.speedShift('slower'),
                71: () => Controls.speedShift('faster'),
                72: () => Controls.speedShift('normal')
            }[note];
            if (handler) handler();
        }
    }

    // Grid handling
    static async initializeGrid() {
        try {
            // Connect to the WebSocket server that's running in api/grid.js
            this.ws = new WebSocket('ws://localhost:8080');

            this.ws.onopen = () => {
                console.log('Connected to grid WebSocket server');
                this.gridEnabled = true;
                this.initGridLEDs();
                this.startGridRefresh();
                this.startPlayheadMonitor();
                // Force an initial LED refresh
                this.dirty = true;
            };

            this.ws.onclose = () => {
                console.log('Disconnected from grid WebSocket server');
                this.gridEnabled = false;
            };

            this.ws.onerror = (error) => {
                console.error('Grid WebSocket error:', error);
                this.gridEnabled = false;
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'gridKey') {
                        this.handleGridPress(data.x, data.y, data.s);
                    }
                } catch (error) {
                    console.error('Error processing grid message:', error);
                }
            };
        } catch (error) {
            console.warn('Grid initialization failed:', error);
            this.gridEnabled = false;
        }
    }

    static initGridLEDs() {
        for (let y = 0; y < 8; y++) {
            this.led[y] = [];
            for (let x = 0; x < 16; x++) {
                this.led[y][x] = 0;
            }
        }
    }

    static handleGridPress(x, y, s) {
        if (s !== 1) return; // Only handle button presses

        const key = `${y},${x}`;
        const handler = this.gridMapping[key];
        if (handler) {
            handler();
            this.dirty = true;
        }
    }

    static startGridRefresh() {
        const refresh = () => {
            if (this.dirty && this.gridEnabled) {
                // Clear all LEDs
                this.initGridLEDs();

                // Light up all mapped controls with mild brightness
                Object.keys(this.gridMapping).forEach(key => {
                    const [y, x] = key.split(',').map(Number);
                    this.led[y][x] = 4;  // mild brightness
                });

                // Update playhead row for time-based media
                const focusedBuffer = Buffer.buffers.find(b => b.focus);
                if (focusedBuffer?.element && ['video', 'audio'].includes(focusedBuffer.filetype)) {
                    // Dimly illuminate the entire top row
                    for (let x = 0; x < 16; x++) {
                        this.led[0][x] = 2;
                    }
                    
                    // Calculate playhead position
                    const duration = focusedBuffer.element.duration;
                    const currentTime = focusedBuffer.element.currentTime;
                    const position = Math.floor((currentTime / duration) * 16);
                    
                    // Brightly illuminate the current position
                    this.led[0][position] = 15;
                }

                // Update buffer focus buttons
                Buffer.buffers.forEach((buffer, index) => {
                    this.led[7][index] = buffer.focus ? 15 : 4;
                });

                if (focusedBuffer) {
                    // Update speed buttons
                    if (focusedBuffer.element) {
                        const currentSpeed = focusedBuffer.element.playbackRate;
                        Controls.speeds.forEach((speed, index) => {
                            this.led[4][index + 4] = Math.abs(currentSpeed - speed) < 0.01 ? 15 : 4;
                        });
                    }

                    // Update collection buttons
                    const nonEmptyCollections = Array.from(collections.entries())
                        .filter(([name, collection]) => collection.items.length > 0);
                    nonEmptyCollections.forEach(([name], index) => {
                        this.led[3][index + 4] = (name === focusedBuffer.currentCollection?.name) ? 15 : 4;
                    });
                }

                // Update patch buttons - light up the current patch
                const patchArray = Object.keys(patches);
                patchArray.forEach((patchName, index) => {
                    this.led[2][index + 4] = (patchName === currentPatch) ? 15 : 4;
                });

                // Send LED update to server
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
    }

    static cleanup() {
        if (this.ws) {
            this.ws.close();
        }
        if (this.playheadInterval) {
            clearInterval(this.playheadInterval);
        }
    }

    // Add method to set up dynamic grid controls
    static setupDynamicGridControls() {
        // Add dynamic buffer focus buttons based on available buffers
        Buffer.buffers.forEach((buffer, index) => {
            this.gridMapping[`7,${index}`] = () => Controls.focus(index);
        });

        // Add playhead position controls
        for (let x = 0; x < 16; x++) {
            this.gridMapping[`0,${x}`] = () => {
                const focusedBuffer = Buffer.buffers.find(b => b.focus);
                if (focusedBuffer?.element && ['video', 'audio'].includes(focusedBuffer.filetype)) {
                    Controls.timeShift(x / 16);
                    this.dirty = true;
                }
            };
        }

        // Add dynamic speed buttons
        Controls.speeds.forEach((speed, index) => {
            this.gridMapping[`4,${index + 4}`] = () => Controls.speedShift(speed);
        });

        // Add dynamic collection buttons (skip empty collections)
        const nonEmptyCollections = Array.from(collections.entries())
            .filter(([name, collection]) => collection.items.length > 0);
        nonEmptyCollections.forEach(([name], index) => {
            this.gridMapping[`3,${index + 4}`] = () => {
                const focusedBuffer = Buffer.buffers.find(b => b.focus);
                if (focusedBuffer) {
                    focusedBuffer.setCollection(name);
                }
            };
        });

        // Add dynamic patch buttons with fixed functions
        const patchArray = Object.keys(patches);
        patchArray.forEach((patchName, index) => {
            this.gridMapping[`2,${index + 4}`] = () => {
                Controls.switchPatch(patchName);
                this.dirty = true;
            };
        });
    }

    static startPlayheadMonitor() {
        // Clear any existing interval
        if (this.playheadInterval) {
            clearInterval(this.playheadInterval);
        }

        // Start a new interval to check media position
        this.playheadInterval = setInterval(() => {
            const focusedBuffer = Buffer.buffers.find(b => b.focus);
            if (focusedBuffer?.element && ['video', 'audio'].includes(focusedBuffer.filetype)) {
                this.dirty = true;
            }
        }, 100); // Check every 100ms
    }

    static initSpeechRecognition() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const voiceCommands = {
            'focus (one|1)': () => Controls.focus(0),
            'focus (two|2)': () => Controls.focus(1),
            'previous (file|video|media)': () => Controls.switchFile('prev'),
            'next (file|video|media)': () => Controls.switchFile('next'),
            'random (file|video|media)': () => Controls.switchFile('random'),
            'next collection': () => Controls.switchCollection('next'),
            'back': () => Controls.timeShift('backward'),
            'forward': () => Controls.timeShift('forward'),
            'replay': () => Controls.timeShift('reset'),
            'random time': () => Controls.timeShift('random'),
            'speed up': () => Controls.speedShift('faster'),
            'slow down': () => Controls.speedShift('slower'),
            'normal speed': () => Controls.speedShift('normal'),
            'switch camera': () => Controls.switchCam(),
            'next patch': () => Controls.switchPatch('next'),
            'previous collection': () => Controls.switchCollection('prev'),
            'random collection': () => Controls.switchCollection('random'),
            'load patch (one|1)': () => Controls.switchPatch('1'),
            'load patch (two|2)': () => Controls.switchPatch('2'),
            'load patch (three|3)': () => Controls.switchPatch('3'),
            'load patch (four|4)': () => Controls.switchPatch('4'),
            'load patch (five|5)': () => Controls.switchPatch('5'),
            'load patch (six|6)': () => Controls.switchPatch('6'),
            
        };

        recognition.onresult = (event) => {
            const last = event.results.length - 1;
            const command = event.results[last][0].transcript.trim().toLowerCase();
            
            console.log('Voice command received:', command);
            
            for (const [pattern, handler] of Object.entries(voiceCommands)) {
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(command)) {
                    handler();
                    break;
                }
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
        };

        recognition.onend = () => {
            // Restart recognition when it ends
            recognition.start();
        };

        // Start recognition
        try {
            recognition.start();
            console.log('Speech recognition initialized');
        } catch (error) {
            console.error('Error starting speech recognition:', error);
        }
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    Devices.cleanup();
}); 