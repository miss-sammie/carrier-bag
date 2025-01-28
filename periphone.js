console.log("Starting periphone.js");
import { frequencyToLetter, initializeTextOverlay, postText } from './sheSpeaks.js'
import { initHydra, reloadActiveSource, reloadPatch, resizeHydraPatch } from './hydra.js';
import { Buffer } from './buffers.js';
import { Controls } from './controls.js';
import { loadLibrary, mediaLibrary, getCollection } from './media.js';
import { UIGrid, BufferStatusComponent } from './interface.js';
import { Sidebar } from './sidebar.js';

console.log("Imports completed");

// Initialize buffers
Buffer.initBuffers(2, 0);
console.log("Buffers initialized");

window.Buffer = Buffer;
window.Controls = Controls;

// Initialize sidebar
const sidebar = new Sidebar();
window.sidebar = sidebar;

// Initialize UI first
const ui = new UIGrid();
window.ui = ui;

// Add buffer status components to the first row
Buffer.buffers.forEach((buffer, index) => {
    ui.addComponent(0, index, BufferStatusComponent, buffer);
});

console.log("About to load library...");
await loadLibrary()
    .then(async () => {
        console.log("Library loaded:", mediaLibrary);
        
        // Then set collections if they exist
        try {
            if (getCollection('Videos')?.items.length > 0) {
                Buffer.buffers[0].setCollection('Videos');
            }
            if (getCollection('Images')?.items.length > 0) {
                Buffer.buffers[1].setCollection('Images');
            }
        } catch (error) {
            console.warn('Failed to set initial collections:', error);
        }
        
        // Initialize controls
        Controls.init();
        Controls.initializeMIDI();

        // Only try to load media if collections are set
        try {
            if (Buffer.buffers[0].currentCollection?.items.length > 0) {
                await Buffer.buffers[0].loadMedia(Buffer.buffers[0].currentCollection.items[0].url);
            }
            if (Buffer.buffers[1].currentCollection?.items.length > 0) {
                await Buffer.buffers[1].loadMedia(Buffer.buffers[1].currentCollection.items[0].url);
            }
        } catch (error) {
            console.warn('Failed to load initial media:', error);
        }

        const hydra = initHydra();
        reloadPatch();

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

        initializeTextOverlay();


        // Update sidebar with loaded data
        sidebar.update();
    })
    .catch(error => {
        console.error("Error in main:", error);
    });

// Function to update UI components
function updateUI() {
    if (ui && ui.components) {
        ui.components.forEach(component => {
            component.update();
        });
    }
    requestAnimationFrame(updateUI);
}

// Start the UI update loop
updateUI();





