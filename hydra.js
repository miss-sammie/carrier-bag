// Initialize Hydra
function initHydra() {
    const hydraCanvas = document.createElement("canvas");
    hydraCanvas.id = "hydraCanvas";
    hydraCanvas.className = "hydraCanvas";
    document.body.appendChild(hydraCanvas);

    const hydra = new Hydra({
        canvas: hydraCanvas,
        detectAudio: true,
        enableStreamCapture: false,
        width: window.innerWidth,
        height: window.innerHeight,
    });

    return hydra;
}

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
        .blend(s2)
        .out();
}

export { initHydra, reloadActiveSource, reloadPatch };