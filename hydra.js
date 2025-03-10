import { Controls } from './controls.js';

// Initialize Hydra
let resolutionMode = "high"  
let currentPatch = 1
let textCanvasInitialized = false;

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
        hydraCanvas.width = 1920;
        hydraCanvas.height = 1080;
    } else if (resolutionMode === "low") {
        hydraCanvas.width = 320;  // Or whatever "low" resolution you want
        hydraCanvas.height = 180; // Maintaining 16:9 aspect ratio
    }

    const hydra = new Hydra({
        canvas: hydraCanvas,
        detectAudio: true,
        enableStreamCapture: false,
        width: hydraCanvas.width,   // Match canvas resolution
        height: hydraCanvas.height, 
        makeGlobal: true 
    });

    // Initialize text canvas if enabled in config
    // if (window.scene?.config?.textCanvas?.enabled && !textCanvasInitialized) {
    //     s3.init({src: document.getElementById('text-canvas')});
    //     textCanvasInitialized = true;
    // }

    


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

// Reload just the active source
function reloadActiveSource(type) {
    //s3.init({src: document.getElementById('text-canvas')});
    if (type === 'cam') {
        s0.clear()
        const cameraIndex = window.Devices.webcams[window.currentCam];
        console.log('[Hydra] Reloading camera source:', {
            type,
            currentCam: window.currentCam,
            webcamsArray: window.Devices.webcams,
            selectedCameraIndex: cameraIndex,
            currentSource: s0.src,  // Log current source state
            currentDynamic: s0.dynamic,  // Log if source is dynamic
            currentTexture: s0.tex  // Log current texture state
        });
        
        s0.initCam(cameraIndex);
        return;
    }

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
                s1.init({src: focusedBuffer.element, dynamic: true});
                break;
            case 1:
                s2.init({src: focusedBuffer.element, dynamic: true});
                break;
        }
    }

}

// Remove switchCam function since it's now in Controls

// Remove the hardcoded patches object and make it a variable that can be set
let patches = {};

// Modify reloadPatch to handle string-based patches
function reloadPatch(patch) {
    if (!patch) {
        patch = 1;
    }
    
    const patchCode = patches[patch];
    if (patchCode) {
        // Create a context that includes text canvas initialization in the same scope
        const context = `
            // System variables
            const webcams = Array.isArray(window.webcams) ? window.webcams : [0];
            const currentCam = typeof window.currentCam === 'number' ? window.currentCam : 0;
            const Buffer = {
                buffers: Array.isArray(window.Buffer) ? window.Buffer : []
            };
            const cc = Array.isArray(window.Devices?.cc) ? window.Devices.cc : Array(128).fill(0.5);

            // Initialize text canvas in the same context as the patch
            if (window.scene?.config?.textCanvas?.enabled) {
                const textCanvas = document.getElementById('text-canvas');
                if (textCanvas) {
                    s3.init({src: textCanvas});
                }
            }

            // Run the actual patch code
            ${patchCode}
        `;
        
        const patchFunction = new Function(`return () => {
            ${context}
        }`)();
        patchFunction();
        currentPatch = patch;
        window.currentPatch = patch;
    } else {
        console.error(`Patch ${patch} not found`);
    }
}

// Add method to set patches from scene config
function setPatches(newPatches) {
    patches = newPatches;
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
    currentPatch,
    patches
};