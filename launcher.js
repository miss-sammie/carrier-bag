console.log("Starting carrier bag...");
import { frequencyToLetter, initializeTextOverlay, postText, initBabbler } from './sheSpeaks.js'
import { initHydra, reloadActiveSource, reloadPatch, resizeHydraPatch } from './hydra.js';
import { Buffer } from './buffers.js';
import { Controls } from './controls.js';
import { loadLibrary, mediaLibrary, getCollection } from './media.js';
import { Sidebar } from './sidebar.js';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Imports completed");

    // Initialize buffers
    Buffer.initBuffers(2, 0);
    console.log("Buffers initialized");

    window.Buffer = Buffer;
    window.Controls = Controls;
    window.reloadPatch = reloadPatch;

    try {
        console.log("About to load library...");
        await loadLibrary();
        console.log("Library loaded:", mediaLibrary);
        
        // Then set collections if they exist
        if (getCollection('Videos')?.items.length > 0) {
            await Buffer.buffers[0].setCollection('Videos');
            await Buffer.buffers[1].setCollection('Videos');
        }
        
        // Initialize controls
        Controls.init();
        Controls.initializeMIDI();

        const hydra = initHydra();
        reloadPatch(1);

        // Initialize babbler with popup mode
        initBabbler('popup');

    } catch (error) {
        console.error("Error in main:", error);
    }
});









