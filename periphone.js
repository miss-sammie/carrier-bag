console.log("Starting periphone.js");

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

let hydra, hydraCanvas;
hydraCanvas = document.createElement("canvas");
hydraCanvas.id = "hydraCanvas";
hydraCanvas.className = "hydraCanvas";  
document.body.appendChild(hydraCanvas); // Add this line to append the canvas

hydra = new Hydra({
    canvas: hydraCanvas,
    detectAudio: true,
    enableStreamCapture: false,
    width: window.innerWidth,
    height: window.innerHeight,
});


console.log("About to load library...");
await loadLibrary('library/library-water.json')
    .then(() => {
        console.log("Library loaded:", mediaLibrary);
        Buffer.buffers[0].setCollection('Videos')  
        Controls.init()
        s0.initCam() 
       // Buffer.buffers[1].loadMedia(videos[4].url)   

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

const imgTest = Buffer.buffers[0].element
const imgTest2 = Buffer.buffers[1].element  

//s0.initCam()
s2.init({src: imgTest2})

function reloadPatch() {
    s1.init({src: Buffer.buffers[0].element})
    src(s0)
    .blend(s1)
   // .modulate(s2)
  //  .modulateRotate(voronoi(12,() => a.fft[6]*12) )
    .out() 

}

reloadPatch()

export { reloadPatch }