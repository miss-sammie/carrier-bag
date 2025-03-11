import { initHydra, reloadPatch, setPatches } from './hydra.js';
import { initializeTextOverlay } from './sheSpeaks.js';
import { Sidebar } from './sidebar.js';
import { Buffer } from './buffers.js';
import { loadLibrary, getCollection } from './media.js';
import { initBabbler } from './sheSpeaks.js';
import { Controls } from './controls.js';
import { Devices } from './devices.js';

export class Scene {
    constructor(config = {}) {
        this.config = {
            name: config.name || "Default",
            videoBuffers: config.videoBuffers || [0, 1],
            audioBuffers: config.audioBuffers || [2,3],
            collections: config.collections || {},
            folders: config.folders || null,
            babblerEnabled: config.babblerEnabled ?? false,
            hydraEnabled: config.hydraEnabled ?? true,
            sidebarVisible: config.sidebarVisible ?? false,
            textCanvas: {
                enabled: config.textCanvas?.enabled ?? true
              },
            kioskMode: {
                enabled: config.kioskMode?.enabled ?? false,
                interval: config.kioskMode?.interval ?? 5000
            },
            hydraConfig: config.hydraConfig || {
                width: 1280,
                height: 720,
                detectAudio: false,
                enableStreamCapture: false,
                canvas: {
                    id: "hydraCanvas",
                    className: "hydraCanvas"
                }
            },
            controls: {
                keyboard: true,
                midi: true,
                midicc: true,
                grid: true,
                speech: true,
                text: true,
                ...config.controls // This will properly override defaults
            },
            patches: config.patches || {},
            savedStates: config.savedStates || []
        };
        
        this.hydra = null;
        this.sidebar = null;
        this.buffers = [];
    }

    async initialize() {
        try {
            // Load media library first with folder restrictions
            await loadLibrary(this.config.folders);

            // Initialize buffers based on config
            const visualCount = this.config.videoBuffers || 0;
            const audioCount = this.config.audioBuffers || 0;
            this.buffers = Buffer.initBuffers(visualCount, audioCount);
            
            // Make buffers globally available
            window.Buffer = this.buffers;

            // Initialize Hydra if enabled
            if (this.config.hydraEnabled) {
                this.hydra = initHydra(this.config.hydraConfig);
                window.hydra = this.hydra
                await this.hydra.loadScript("./hydra-src.js")
            }

            // Set collections for each buffer and wait for them to load
            const collectionPromises = Object.entries(this.config.collections).map(async ([bufferIndex, collectionName]) => {
                const buffer = this.buffers[bufferIndex];
                if (buffer) {
                    const collection = getCollection(collectionName);
                    if (collection) {
                        console.log(`Setting buffer ${bufferIndex} (${buffer.type}) to collection "${collectionName}"`);
                        
                        // Check if this is an audio buffer and the collection has audio items
                        if (buffer.type === 'audio') {
                            const audioItems = collection.items.filter(item => item.type === 'audio');
                            if (audioItems.length === 0) {
                                console.warn(`Collection "${collectionName}" has no audio items for audio buffer ${bufferIndex}`);
                            }
                        }
                        
                        // Set the collection
                        await buffer.setCollection(collectionName);
                    } else {
                        console.warn(`Collection "${collectionName}" not found for buffer ${bufferIndex}`);
                    }
                } else {
                    console.warn(`Buffer ${bufferIndex} not found`);
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
                initBabbler('both');
                
            }

            // Initialize devices if specified in config
            if (this.config.controls) {

                console.log('Initializing devices with config:', this.config.controls);
                await Devices.init(this.config.controls);
            }
            // Initialize kiosk mode if enabled (after controls are set up)
            if (this.config.kioskMode?.enabled) {
                console.log('Kiosk mode config found:', this.config.kioskMode);
                Devices.initKioskMode(this.config.kioskMode.interval);
            } else {
                console.log('Kiosk mode not enabled in config');
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
            const response = await fetch(`./library/scenes/${sceneName}.json`);
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
            // Use exact case from scene name
            const sceneName = this.config.name;
            const response = await fetch(`./library/scenes/${sceneName}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: json
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to save scene: ${errorText}`);
            }
            console.log(`Scene "${sceneName}" saved`);
        } catch (error) {
            console.error('Error saving scene:', error);
            throw error;
        }
    }

    captureState(stateName = new Date().toISOString()) {
        const state = {
            name: stateName,
            timestamp: Date.now(),
            currentPatch: window.currentPatch || 1,
            bufferStates: this.buffers.map(buffer => {
                // Get the current media URL directly
                const mediaUrl = buffer.element?.src || null;
                
                return {
                    type: buffer.type,
                    focus: buffer.focus,
                    currentCollection: buffer.currentCollection?.name,
                    currentIndex: buffer.currentIndex,
                    // Store the direct URL to the media file
                    mediaUrl: mediaUrl,
                    currentTime: buffer.element?.currentTime || 0,
                    playbackRate: buffer.element?.playbackRate || 1,
                    muted: buffer.element?.muted || false,
                    paused: buffer.element?.paused || false
                };
            })
        };

        // Add state to savedStates array
        this.config.savedStates.push(state);
        
        // Save scene to persist the state
        return this.save();
    }

    async loadState(stateNameOrIndex) {
        const state = typeof stateNameOrIndex === 'number' 
            ? this.config.savedStates[stateNameOrIndex]
            : this.config.savedStates.find(s => s.name === stateNameOrIndex);

        if (!state) {
            throw new Error(`State "${stateNameOrIndex}" not found`);
        }

        console.log(`Loading state: ${state.name}`);

        // Load patch
        if (state.currentPatch) {
            reloadPatch(state.currentPatch);
        }

        // Load buffer states
        await Promise.all(state.bufferStates.map(async (bufferState, index) => {
            const buffer = this.buffers[index];
            if (!buffer) return;

            console.log(`Processing buffer ${index} (${buffer.type})`);

            // Set collection if specified
            if (bufferState.currentCollection) {
                try {
                    await buffer.setCollection(bufferState.currentCollection);
                } catch (error) {
                    console.warn(`Could not set collection "${bufferState.currentCollection}" for buffer ${index}: ${error.message}`);
                    // Continue with loading - we'll try to load by URL directly
                }
            }

            // Set focus
            if (bufferState.focus) {
                Controls.focus(index);
            }

            // Load media - prioritize direct URL over collection index
            if (bufferState.mediaUrl) {
                try {
                    // Attempt to load media directly by URL
                    console.log(`Loading buffer ${index} directly by URL: ${bufferState.mediaUrl}`);
                    await buffer.loadMedia(bufferState.mediaUrl);
                } catch (error) {
                    console.warn(`Failed to load media by URL for buffer ${index}: ${error.message}`);
                    
                    // Fall back to collection index method if URL load fails
                    if (buffer.currentCollection && typeof bufferState.currentIndex === 'number') {
                        try {
                            buffer.currentIndex = bufferState.currentIndex;
                            const media = buffer.currentCollection.items[bufferState.currentIndex];
                            if (media) {
                                console.log(`Falling back to collection index method for buffer ${index}`);
                                await buffer.loadMedia(media.url);
                            }
                        } catch (fallbackError) {
                            console.error(`Fallback loading also failed for buffer ${index}: ${fallbackError.message}`);
                        }
                    }
                }
            } 
            // If no direct URL, try collection index method
            else if (buffer.currentCollection && typeof bufferState.currentIndex === 'number') {
                try {
                    buffer.currentIndex = bufferState.currentIndex;
                    const media = buffer.currentCollection.items[bufferState.currentIndex];
                    if (media) {
                        console.log(`Loading buffer ${index} by collection index: ${bufferState.currentIndex}`);
                        await buffer.loadMedia(media.url);
                    }
                } catch (error) {
                    console.error(`Failed to load media by collection index for buffer ${index}: ${error.message}`);
                }
            }

            // Configure media playback properties
            if (buffer.element) {
                if (typeof bufferState.currentTime === 'number') {
                    buffer.element.currentTime = bufferState.currentTime;
                }
                if (typeof bufferState.playbackRate === 'number') {
                    buffer.element.playbackRate = bufferState.playbackRate;
                }
                buffer.element.muted = bufferState.muted;
                
                // Explicitly handle both paused and playing states
                if (bufferState.paused) {
                    buffer.element.pause();
                } else {
                    buffer.element.play().catch(console.error);
                }
            }
        }));

        console.log(`State "${state.name}" loaded successfully`);
        return state;
    }

    listStates() {
        return this.config.savedStates.map((state, index) => ({
            index,
            name: state.name,
            timestamp: state.timestamp
        }));
    }

    removeState(stateNameOrIndex) {
        const index = typeof stateNameOrIndex === 'number'
            ? stateNameOrIndex
            : this.config.savedStates.findIndex(s => s.name === stateNameOrIndex);

        if (index === -1) {
            throw new Error(`State "${stateNameOrIndex}" not found`);
        }

        this.config.savedStates.splice(index, 1);
        return this.save();
    }

    async newPlaylist(playlistName) {
        const playlist = {
            name: playlistName,
            created: Date.now(),
            states: []
        };

        try {
            const response = await fetch(`/library/playlists/${playlistName}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(playlist, null, 2)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to create playlist: ${await response.text()}`);
            }
            
            return playlist;
        } catch (error) {
            console.error('Error creating playlist:', error);
            throw error;
        }
    }

    async loadPlaylist(playlistName) {
        try {
            const response = await fetch(`/library/playlists/${playlistName}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load playlist: ${playlistName}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Error loading playlist ${playlistName}:`, error);
            throw error;
        }
    }

    async saveStateToPlaylist(playlistName, stateName = new Date().toISOString()) {
        try {
            // Load existing playlist
            const playlist = await this.loadPlaylist(playlistName);
            
            // Create state with scene info
            const state = {
                name: stateName,
                timestamp: Date.now(),
                scene: this.config.name,
                currentPatch: window.currentPatch || 1,
                bufferStates: this.buffers.map(buffer => ({
                    type: buffer.type,
                    focus: buffer.focus,
                    currentCollection: buffer.currentCollection?.name,
                    currentIndex: buffer.currentIndex,
                    currentTime: buffer.element?.currentTime || 0,
                    playbackRate: buffer.element?.playbackRate || 1,
                    muted: buffer.element?.muted || false,
                    paused: buffer.element?.paused || false
                }))
            };

            // Add state to playlist
            playlist.states.push(state);

            // Save updated playlist
            const response = await fetch(`/library/playlists/${playlistName}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(playlist, null, 2)
            });

            if (!response.ok) {
                throw new Error(`Failed to save state to playlist: ${await response.text()}`);
            }

            return state;
        } catch (error) {
            console.error('Error saving state to playlist:', error);
            throw error;
        }
    }

    async loadStateFromPlaylist(playlistName, stateNameOrIndex) {
        try {
            const playlist = await this.loadPlaylist(playlistName);
            
            const state = typeof stateNameOrIndex === 'number' 
                ? playlist.states[stateNameOrIndex]
                : playlist.states.find(s => s.name === stateNameOrIndex);

            if (!state) {
                throw new Error(`State "${stateNameOrIndex}" not found in playlist`);
            }

            // If state is from a different scene, load that scene first
            if (state.scene && state.scene !== this.config.name) {
                const newScene = await Scene.load(state.scene);
                await newScene.initialize();
            }

            // Load patch
            if (state.currentPatch) {
                reloadPatch(state.currentPatch);
            }

            // Load buffer states
            await Promise.all(state.bufferStates.map(async (bufferState, index) => {
                const buffer = this.buffers[index];
                if (!buffer) return;

                if (bufferState.currentCollection) {
                    await buffer.setCollection(bufferState.currentCollection);
                }

                if (bufferState.focus) {
                    Controls.focus(index);
                }

                if (buffer.currentCollection && typeof bufferState.currentIndex === 'number') {
                    buffer.currentIndex = bufferState.currentIndex;
                    const media = buffer.currentCollection.items[bufferState.currentIndex];
                    if (media) {
                        await buffer.loadMedia(media.url);
                    }
                }

                if (buffer.element) {
                    if (typeof bufferState.currentTime === 'number') {
                        buffer.element.currentTime = bufferState.currentTime;
                    }
                    if (typeof bufferState.playbackRate === 'number') {
                        buffer.element.playbackRate = bufferState.playbackRate;
                    }
                    buffer.element.muted = bufferState.muted;
                    if (!bufferState.paused) {
                        buffer.element.play().catch(console.error);
                    }
                }
            }));

            return state;
        } catch (error) {
            console.error('Error loading state from playlist:', error);
            throw error;
        }
    }

    async listPlaylists() {
        try {
            const response = await fetch('/library/playlists');
            if (!response.ok) {
                throw new Error('Failed to list playlists');
            }
            return await response.json();
        } catch (error) {
            console.error('Error listing playlists:', error);
            throw error;
        }
    }
} 