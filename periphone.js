console.log("Starting periphone.js");
import { initHydra, reloadActiveSource, reloadPatch } from './hydra.js';
import { frequencyToLetter } from './sheSpeaks.js'
import { Buffer } from './buffers.js';
import { Controls } from './controls.js';
import { loadLibrary, mediaLibrary, getCollection, createCollection  } from './media.js';

console.log("Imports completed");

// Initialize buffers
Buffer.initBuffers(4, 0);
console.log("Buffers initialized");
window.Buffer = Buffer
window.Controls = Controls


console.log("About to load library...");
await loadLibrary('library/library-water.json')
    .then(() => {
        console.log("Library loaded:", mediaLibrary);
        Buffer.buffers[0].setCollection('Videos')  
        Buffer.buffers[1].setCollection('Images')
        Controls.init()
        Controls.initializeMIDI()
       // Buffer.buffers[1].loadMedia(videos[4].url)   
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



