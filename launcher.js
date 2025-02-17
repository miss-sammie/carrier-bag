console.log("Starting carrier bag...");
import { Scene } from './scene.js';
import { frequencyToLetter, initializeTextOverlay, postText, initBabbler } from './sheSpeaks.js'
import { initHydra, reloadActiveSource, reloadPatch, resizeHydraPatch } from './hydra.js';
import { Buffer } from './buffers.js';
import { Controls } from './controls.js';
import { loadLibrary, mediaLibrary, getCollection } from './media.js';
import { Sidebar } from './sidebar.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Imports completed");
    
    try {
        const scene = await Scene.load('dj2');
        await scene.initialize();
        
        // Make necessary objects available globally
        window.Buffer = scene.buffers;
        window.Controls = Controls;
        window.reloadPatch = reloadPatch;
        
        // Make scene and state management globally available
        window.scene = scene;
        window.captureState = (name) => scene.captureState(name);
        window.loadState = (nameOrIndex) => scene.loadState(nameOrIndex);
        window.listStates = () => scene.listStates();
        window.removeState = (nameOrIndex) => scene.removeState(nameOrIndex);
        
        // Make playlist management globally available
        window.newPlaylist = (name) => scene.newPlaylist(name);
        window.loadPlaylist = (name) => scene.loadPlaylist(name);
        window.saveStateToPlaylist = (playlist, name) => scene.saveStateToPlaylist(playlist, name);
        window.loadStateFromPlaylist = (playlist, nameOrIndex) => scene.loadStateFromPlaylist(playlist, nameOrIndex);
        window.listPlaylists = () => scene.listPlaylists();
        
    } catch (error) {
        console.error("Error in main:", error);
    }
});









