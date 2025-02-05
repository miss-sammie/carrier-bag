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

// Reload entire patch
function reloadPatch(patch) {
    // s0.initCam()
    // s1.init({src: Buffer.buffers[0].element});
    // s2.init({src: Buffer.buffers[1].element});
    // src(s1)
    //     .modulate(s2, () => a.fft[0])
    //     .blend(s0, () => a.fft[3]*4)
    //     .modulate(s0,() => a.fft[3]*2)
    //     .modulate(s3,() => a.fft[2]*2)
    //     .blend(s3,.5)
    //     .out();
    if (patch) {
        patches[patch]();
    } else {
        patches[1]();
    }
}

const patches = {
    1: () => {
    s0.initCam(0)
    //s3.initCam(5)
    s1.init({src: Buffer.buffers[0].element});
    s2.init({src: Buffer.buffers[1].element});
    
    src(s1)
        .modulate(s2, () => a.fft[0])
        .blend(s0, () => a.fft[3]*4)
        .modulate(s0,() => a.fft[3]*2)
       // .modulate(s3,() => a.fft[2]*2)
       // .blend(s3,.5)
        .out();
    },
    2: () => {
        s0.initCam()
        s1.init({src: Buffer.buffers[0].element});
        s2.init({src: Buffer.buffers[1].element});
        src(s1)
            .add(s2)
            .out();
    },
    3: () => {
        s1.init({src: Buffer.buffers[0].element});
        src(s1)
            .out();
    },
    4: () => {
        s2.init({src: Buffer.buffers[1].element});
        src(s2)
            .out();
    }
    ,5: () => {
        s0.initCam(5)
        s1.initCam(0)

        src(s0)
            .modulate(s1)
            .out();
    }
}

// Add a function to toggle resolution
function toggleResolution() {
    resolutionMode = resolutionMode === "high" ? "low" : "high";
    const hydra = initHydra();  // Reinitialize with new resolution
    reloadPatch();  // Reload the patch to update sources
}

export { initHydra, reloadActiveSource, reloadPatch, resizeHydraPatch, toggleResolution, patches };