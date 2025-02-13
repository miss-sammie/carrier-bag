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
        const scene = await Scene.load('periphone');
        await scene.initialize();
        
        // Make necessary objects available globally
        window.Buffer = scene.buffers;
        window.Controls = Controls;
        window.reloadPatch = reloadPatch;
        
    } catch (error) {
        console.error("Error in main:", error);
    }
});









