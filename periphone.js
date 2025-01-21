console.log("Starting periphone.js");


import { frequencyToLetter } from './sheSpeaks.js'

import { Buffer, load_library, getMediaType, media } from './buffers.js';

console.log("Imports completed");

// Initialize buffers
Buffer.initBuffers(4, 0);
console.log("Buffers initialized");

console.log("About to load library...");
await load_library('library/library-default_lib.json')
    .then(() => {
        console.log("Library loaded:", media);
        Buffer.buffers[0].loadMedia(media.filter(m => m.type === 'video')[1].url)   
        Buffer.buffers[1].loadMedia(media.filter(m => m.type === 'video')[2].url)   
    })
    .catch(error => {
        console.error("Error in main:", error);
    });

//console.log(media);
 



let hydra, hydraCanvas;
hydraCanvas = document.createElement("canvas");
// hydraCanvas.width = 480;
//  hydraCanvas.height = 480;




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

s0.initCam()
s1.init({src: imgTest})
s2.init({src: imgTest2})

src(s0)
    .blend(s1)
    .modulate(s2)
  //  .modulateRotate(voronoi(12,() => a.fft[6]*12) )
    .out() 
    

