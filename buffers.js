class Buffer {
    constructor(type, slot) {
        this.type = type;
        this.filetype = null // 'visual' or 'audio'
        this.url = null;
        this.active = false;
        this.slot = slot;
        this.element = null;
    }

    loadMedia(url) {
        // First remove any existing element from the DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.url = url;
        const mediaType = getMediaType(url);

        // Validate media type against buffer type
        if (this.type === 'audio' && mediaType !== 'audio') {
            throw new Error(`Cannot load ${mediaType} into audio buffer (slot ${this.slot})`);
        }
        if (this.type === 'visual' && !['image', 'video'].includes(mediaType)) {
            throw new Error(`Cannot load ${mediaType} into visual buffer (slot ${this.slot})`);
        }

        // Create new element based on media type
        switch (mediaType) {
            case 'image':
                this.element = document.createElement('img');
                this.element.src = url;
                this.filetype = 'image';
                break;
            case 'video':
                this.element = document.createElement('video');
                this.element.src = url;
                // Optional: add common video attributes
                //this.element.controls = true;
                this.filetype = 'video';
                break;
            case 'audio':
                this.element = new Audio(url);
                // Optional: add common audio attributes
                //this.element.controls = true;
                this.filetype = 'audio';
                break;
            default:
                throw new Error(`Unsupported media type: ${mediaType}`);
        }

        this.active = true;
        return this.element;
    }

    play() {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            this.element.play();
        }
    }

    pause() {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            this.element.pause();
        }
    }

    timeShift(operation) {
        if (this.filetype === 'audio' || this.filetype === 'video') {
            if (operation === 'forward') {
                this.element.currentTime += 10;
            } else if (operation === 'backward') {
                this.element.currentTime -= 10;
            } else if (operation === 'reset') {
                this.element.currentTime = 0;
            } else if(operation === 'random') {
                this.element.currentTime = Math.random() * this.element.duration;
            } else {
                console.warn(`Invalid time shift operation: ${operation}`);
            }
        } else {
            console.warn(`Cannot time shift ${this.filetype} buffer`);
        }   
    }

    speedShift(operation) {
        const currentSpeed = this.element.playbackRate;
        const speeds = [0.5, 1, 2, 4];
        if (this.filetype === 'audio' || this.filetype === 'video') {
            if (operation === 'faster') {
                this.element.playbackRate = speeds[speeds.indexOf(currentSpeed) + 1];
            } else if (operation === 'slower') {
                this.element.playbackRate = speeds[speeds.indexOf(currentSpeed) - 1];
            } else {
                console.warn(`Invalid speed shift operation: ${operation}`);
            }
        } else {
            console.warn(`Cannot speed shift ${this.filetype} buffer`);
        }
    }   

}

const buffers = [];
    
function initBuffers(visualCount, audioCount) {
    // Clear existing buffers
    buffers = [];
    
    // Initialize visual buffers (can handle both images and videos)
    for (let i = 0; i < visualCount; i++) {
        buffers.push(new Buffer('visual', null, i));
    }
    
    // Initialize audio buffers
    for (let i = visualCount; i < visualCount + audioCount; i++) {
        buffers.push(new Buffer('audio', null, i));
    }
    
    return buffers;
}

async function load_library(jsonFilePath) {
    try {
        const response = await fetch(jsonFilePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData = await response.json();

        jsonData.forEach(path => {
            const formattedPath = path.replace(/\\/g, '/');
            const extension = formattedPath.split('.').pop().toLowerCase();
            
            const mediaObj = {
                url: formattedPath,
                type: getMediaType(extension)
            };

            media.push(mediaObj);
            
            switch(mediaObj.type) {
                case 'image':
                    images.push(formattedPath);
                    break;
                case 'video':
                    videos.push(formattedPath);
                    break;
                case 'audio':
                    audio.push(formattedPath);
                    break;
                case 'shape':
                    shapes.push(formattedPath);
                    break;
            }
        });

        console.log("Library loaded:", {
            total: media.length,
            images: images.length,
            videos: videos.length,
            audio: audio.length,
            shapes: shapes.length
        });

    } catch (error) {
        console.error("Failed to load library:", error);
    }
  }


function getMediaType(url) {
    // Early return if no URL
    if (!url) {
        console.warn('No URL provided to getMediaType');
        return 'unknown';
    }

    // Get extension from URL
    const extension = url.split('.').pop().toLowerCase();
    
    // console.log('Checking media type for:', {
    //     url,
    //     extension
    // });

    // Define valid extensions
    const mediaTypes = {
        image: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        video: ['mp4', 'webm', 'mov', 'avi'],
        audio: ['mp3', 'wav', 'ogg', 'aac'],
        shape: ['glb', 'gltf', 'obj']
    };

    // Check extension against types
    for (const [type, extensions] of Object.entries(mediaTypes)) {
        if (extensions.includes(extension)) {
            //console.log(`Found media type: ${type} for extension: ${extension}`);
            return type;
        }
    }

    console.warn(`Unknown extension: ${extension} for URL: ${url}`);
    return 'unknown';
  } 


  


