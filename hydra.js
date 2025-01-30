// Initialize Hydra
let resolutionMode = "high"  

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
    const focusedBuffer = Buffer.buffers.find(b => b.focus);
    if (!focusedBuffer || !focusedBuffer.element) return;

    switch(focusedBuffer.slot) {
        case 0:
            s1.init({src: focusedBuffer.element});
            break;
        case 1:
            s2.init({src: focusedBuffer.element});
            break;
    }
}

// Reload entire patch
function reloadPatch() {
    s0.initCam()
    s1.init({src: Buffer.buffers[0].element});
    s2.init({src: Buffer.buffers[1].element});
    src(s1)
        .modulate(s0)
        .modulate(s2, () => a.fft[0])
        .out();
}

// Add a function to toggle resolution
function toggleResolution() {
    resolutionMode = resolutionMode === "high" ? "low" : "high";
    const hydra = initHydra();  // Reinitialize with new resolution
    reloadPatch();  // Reload the patch to update sources
}

export { initHydra, reloadActiveSource, reloadPatch, resizeHydraPatch, toggleResolution };