import { frequencyToLetter } from './sheSpeaks.js'

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

s0.initCam()

src(s0)
    .modulate(noise(() => a.fft[2]*12))
    .modulateRotate(voronoi(12,() => a.fft[6]*12) )
    .out() 
    

