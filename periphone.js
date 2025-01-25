console.log("Starting periphone.js");
import { initHydra, reloadActiveSource, reloadPatch } from './hydra.js';
import { frequencyToLetter } from './sheSpeaks.js'
import { Buffer } from './buffers.js';
import { Controls } from './controls.js';
import { loadLibrary, mediaLibrary, getCollection, createCollection  } from './media.js';
import { UIGrid, BufferStatusComponent } from './interface.js';
import stateManager from './stateManager.js';

console.log("Imports completed");

// Initialize buffers
Buffer.initBuffers(2, 0);
console.log("Buffers initialized");
window.Buffer = Buffer
window.Controls = Controls


console.log("About to load library...");
await loadLibrary('library/library-water.json')
    .then(async () => {
        console.log("Library loaded:", mediaLibrary);
        
        // First set up UI
        const ui = new UIGrid();
        window.ui = ui;
        
        // Then set collections
        Buffer.buffers[0].setCollection('Videos')  
        Buffer.buffers[1].setCollection('Images')
        
        // Initialize controls
        Controls.init()
        Controls.initializeMIDI()
        
        // Wait for media to load
        await Buffer.buffers[0].loadMedia(Buffer.buffers[0].currentCollection.items[0].url);
        await Buffer.buffers[1].loadMedia(Buffer.buffers[1].currentCollection.items[0].url);
        
        const hydra = initHydra()
        reloadPatch()
    })
    .catch(error => {
        console.error("Error in main:", error);
    });

//console.log(media);

// Wait a bit for audio to initialize
setTimeout(() => {
    // Use requestAnimationFrame for smoother updates
    function update() {
        const fftData = a.fft;
        if (fftData) {
            frequencyToLetter(fftData);
        }
        requestAnimationFrame(update);
    }
    update();
}, 2000); // Wait 1 second for initialization

// After your other initializations:
const ui = new UIGrid();
window.ui = ui; // Make the UIGrid instance globally accessible

// Add buffer status components to the first row
Buffer.buffers.forEach((buffer, index) => {
    ui.addComponent(0, index, BufferStatusComponent, buffer);
});

// Function to update UI components
function updateUI() {
    ui.components.forEach(component => {
        component.update();
    });
    requestAnimationFrame(updateUI);
}

// Start the UI update loop
updateUI();



