import { Controls } from './controls.js';

// Initialize Hydra
let resolutionMode = "high"  
const webcams = [0,5,6]
let currentCam = 0
let currentPatch = 1

function initHydra() {
    // Check for existing canvas
    let hydraCanvas = document.getElementById("hydraCanvas");
    
    if (!hydraCanvas) {
        hydraCanvas = document.createElement("canvas");
        hydraCanvas.id = "hydraCanvas";
        hydraCanvas.className = "hydraCanvas";
        document.body.appendChild(hydraCanvas);
    }

    // Set canvas attributes explicitly
    if (resolutionMode === "high") {
        hydraCanvas.width = 1280;
        hydraCanvas.height = 720;
    } else if (resolutionMode === "low") {
        hydraCanvas.width = 320;  // Or whatever "low" resolution you want
        hydraCanvas.height = 180; // Maintaining 16:9 aspect ratio
    }

    const hydra = new Hydra({
        canvas: hydraCanvas,
        detectAudio: true,
        enableStreamCapture: false,
        width: hydraCanvas.width,   // Match canvas resolution
        height: hydraCanvas.height,  // Match canvas resolution
    });

    return hydra;
}

function resizeHydraPatch() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Resize Hydra canvas
    if (hydraCanvas) {
      hydraCanvas.width = width;
      hydraCanvas.height = height;
      hydra.setResolution(width, height);
    }
  }

  // Initial resize


// Reload just the active source
function reloadActiveSource() {
    if (!window.Buffer || !Array.isArray(window.Buffer)) {
        console.warn('Buffer not properly initialized for reloadActiveSource');
        return;
    }

    const focusedBuffer = window.Buffer.find(b => b.focus);
    if (!focusedBuffer || !focusedBuffer.element) {
        console.warn('No focused buffer or element found');
        return;
    }

    // Only reload if the source has changed
    const source = focusedBuffer.slot === 0 ? s1 : s2;
    if (source && source.src !== focusedBuffer.element) {
        switch(focusedBuffer.slot) {
            case 0:
                s1.init({src: focusedBuffer.element});
                break;
            case 1:
                s2.init({src: focusedBuffer.element});
                break;
        }
    }
}

function switchCam() {
    currentCam = (currentCam + 1) % webcams.length
    reloadPatch(currentPatch)
    console.log("switching cam", currentCam, webcams[currentCam])
   // s0.initCam(webcams[currentCam])
}

// Remove the hardcoded patches object and make it a variable that can be set
let patches = {};

// Modify reloadPatch to handle string-based patches
function reloadPatch(patch) {
    if (!patch) {
        patch = 1;
    }
    
    const patchCode = patches[patch];
    if (patchCode) {
        // Create a context with necessary variables
        const context = `
            const webcams = ${JSON.stringify(webcams)};
            const currentCam = ${currentCam};
            const Buffer = {
                buffers: window.Buffer
            };
            ${patchCode}
        `;
        
        // Convert the string patch into a function and execute it
        const patchFunction = new Function(`return () => {
            ${context}
        }`)();
        patchFunction();
        currentPatch = patch;
    } else {
        console.error(`Patch ${patch} not found`);
    }
}

// Add method to set patches from scene config
function setPatches(newPatches) {
    patches = newPatches;
}

function switchPatch() {
    const numPatches = Object.keys(patches).length;
    currentPatch = (currentPatch % numPatches) + 1;  
    reloadPatch(currentPatch);
    console.log("reloading patch", currentPatch);
}

// Add a function to toggle resolution
function toggleResolution() {
    resolutionMode = resolutionMode === "high" ? "low" : "high";
    const hydra = initHydra();  // Reinitialize with new resolution
    reloadPatch();  // Reload the patch to update sources
}

export { 
    initHydra, 
    reloadActiveSource, 
    reloadPatch, 
    resizeHydraPatch, 
    toggleResolution, 
    setPatches,  
    currentCam, 
    webcams, 
    switchCam, 
    currentPatch, 
    switchPatch,
    patches
};