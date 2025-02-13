import { initHydra, reloadPatch, setPatches, webcams, currentCam, switchCam } from './hydra.js';
import { initializeTextOverlay } from './sheSpeaks.js';
import { Sidebar } from './sidebar.js';
import { Buffer } from './buffers.js';
import { loadLibrary, getCollection } from './media.js';
import { initBabbler } from './sheSpeaks.js';
import { Controls } from './controls.js';

export class Scene {
    constructor(config = {}) {
        this.config = {
            name: config.name || "Default",
            videoBuffers: config.videoBuffers || [0, 1],
            audioBuffers: config.audioBuffers || null,
            collections: config.collections || {},
            babblerEnabled: config.babblerEnabled ?? true,
            hydraEnabled: config.hydraEnabled ?? true,
            sidebarVisible: config.sidebarVisible ?? false,
            hydraConfig: config.hydraConfig || {
                width: 1280,
                height: 720,
                detectAudio: true,
                enableStreamCapture: false,
                canvas: {
                    id: "hydraCanvas",
                    className: "hydraCanvas"
                }
            },
            controls: config.controls || {
                keyboard: true,
                midi: true,
                midicc: true,
                grid: true
            },
            patches: config.patches || {}
        };
        
        this.hydra = null;
        this.sidebar = null;
        this.buffers = [];
    }

    async initialize() {
        try {
            // Load media library first
            await loadLibrary();

            // Initialize buffers based on config
            const visualCount = this.config.videoBuffers || 0;
            const audioCount = this.config.audioBuffers || 0;
            this.buffers = Buffer.initBuffers(visualCount, audioCount);
            
            // Make buffers globally available
            window.Buffer = this.buffers;

            // Initialize Hydra if enabled
            if (this.config.hydraEnabled) {
                this.hydra = initHydra(this.config.hydraConfig);
            }

            // Set collections for each buffer and wait for them to load
            const collectionPromises = Object.entries(this.config.collections).map(async ([bufferIndex, collectionName]) => {
                const buffer = this.buffers[bufferIndex];
                if (buffer && getCollection(collectionName)?.items.length > 0) {
                    await buffer.setCollection(collectionName);
                }
            });

            // Wait for all collections to be loaded
            await Promise.all(collectionPromises);

            // Only now set patches and load initial patch
            if (this.config.hydraEnabled) {
                setPatches(this.config.patches);
                reloadPatch(1);
            }

            // Initialize text overlay if enabled
            if (this.config.babblerEnabled) {
                initBabbler('popup');
            }

            // Initialize controls if specified
            if (this.config.controls) {
                if (this.config.controls.keyboard || this.config.controls.midi || 
                    this.config.controls.grid) {
                    Controls.init();
                }
                if (this.config.controls.midi || this.config.controls.midicc) {
                    Controls.initializeMIDI();
                }
                if (this.config.controls.grid) {
                    Controls.initializeGrid();
                }
            }

            // Initialize sidebar only if enabled in config
            if (this.config.sidebarVisible) {
                this.sidebar = new Sidebar({
                    visible: this.config.sidebarVisible
                });
            }

            console.log(`Scene "${this.config.name}" initialized`);
            return this;

        } catch (error) {
            console.error('Error initializing scene:', error);
            throw error;
        }
    }

    // Static method to load scene from JSON file
    static async load(sceneName) {
        try {
            const response = await fetch(`./scenes/${sceneName}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load scene: ${sceneName}`);
            }
            const config = await response.json();
            return new Scene(config);
        } catch (error) {
            console.error(`Error loading scene ${sceneName}:`, error);
            throw error;
        }
    }

    // Method to save scene config to JSON
    async save() {
        const json = JSON.stringify(this.config, null, 2);
        try {
            const response = await fetch(`./scenes/${this.config.name}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: json
            });
            if (!response.ok) {
                throw new Error('Failed to save scene');
            }
            console.log(`Scene "${this.config.name}" saved`);
        } catch (error) {
            console.error('Error saving scene:', error);
            throw error;
        }
    }
} 