import { Buffer } from './buffers.js';
import { reloadPatch } from './periphone.js';


class Controls {
    static timeOperations = ['forward', 'backward', 'reset', 'random'];
    static speedOperations = ['faster', 'slower', 'normal'];
    static speeds = [0.5, 1, 2, 4];
    static switchOperations = ['next', 'prev', 'random'];

    static switchFile(buffer, direction = 'next') {
        if (!buffer.currentCollection) {
            throw new Error('No collection set for this buffer');
        }
    
        const length = buffer.currentCollection.length;
        
        if (direction === 'next') {
            buffer.currentIndex = (buffer.currentIndex + 1) % length;
        } else if (direction === 'prev') {
            buffer.currentIndex = (buffer.currentIndex - 1 + length) % length;
        } else if (direction === 'random') {
            buffer.currentIndex = Math.floor(Math.random() * length);
        }
    
        const mediaObj = buffer.currentCollection[buffer.currentIndex];
        console.log(`Buffer ${buffer.slot} switching to ${mediaObj.title} (${buffer.currentIndex + 1}/${length})`);
        
        // Load the new media
        const element = buffer.loadMedia(mediaObj.url);
        
        // Ensure video plays if it's a video
        if (buffer.filetype === 'video' && buffer.element) {
            try {
                buffer.element.play().catch(e => {
                    console.log(`Auto-play handled for buffer ${buffer.slot} during switch`);
                });
            } catch (e) {
                console.log(`Play failed for buffer ${buffer.slot} during switch`);
            }
        }
        reloadPatch()
        return element;
    }


    static timeShift(element, operation) {
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            console.warn('Cannot time shift: invalid element');
            return;
        }

        switch(operation) {
            case 'forward':
                element.currentTime += 10;
                break;
            case 'backward':
                element.currentTime -= 10;
                break;
            case 'reset':
                element.currentTime = 0;
                break;
            case 'random':
                element.currentTime = Math.random() * element.duration;
                break;
            default:
                console.warn(`Invalid time shift operation: ${operation}`);
        }
    }

    static speedShift(element, operation) {
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            console.warn('Cannot speed shift: invalid element');
            return;
        }

        const currentSpeed = element.playbackRate;
        const currentIndex = this.speeds.indexOf(currentSpeed);

        switch(operation) {
            case 'faster':
                if (currentIndex < this.speeds.length - 1) {
                    element.playbackRate = this.speeds[currentIndex + 1];
                }
                break;
            case 'slower':
                if (currentIndex > 0) {
                    element.playbackRate = this.speeds[currentIndex - 1];
                }
                break;
            case 'normal':
                element.playbackRate = 1;
                break;
            default:
                console.warn(`Invalid speed shift operation: ${operation}`);
        }
    }

    static togglePlay(element) {
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            console.warn('Cannot toggle play: invalid element');
            return;
        }

        if (element.paused) {
            element.play().catch(e => console.log('Play handled'));
        } else {
            element.pause();
        }
    }

    static toggleMute(element) {
        if (!element || !['VIDEO', 'AUDIO'].includes(element.tagName)) {
            console.warn('Cannot toggle mute: invalid element');
            return;
        }

        element.muted = !element.muted;
    }
}

class Controller {
    constructor(keycode, control) {
        this.keycode = keycode;
        this.control = control;
    }
}

function initControls() {
    keyMapping.forEach((key, control) => {
        new Controller(key, control);
        window.addEventListener('keyup', (event) => {
            if (event.key === key) {
                this.control();
            }
        }); 
    });
}



const keyMapping = {
    'Digit1': () => focus(Buffer.buffers[0]),
    'Digit2': () => focus(Buffer.buffers[1]),
    'Digit3': () => focus(Buffer.buffers[2]),
    'Digit4': () => focus(Buffer.buffers[3]),
    'KeyQ': () => switchFile('next'),
    'KeyW': () => switchFile('previous'),
    'KeyE': () => switchFile('random'),

};

function focus(buffer) {
    Buffer.buffers.forEach(buffer  => {
        if (Buffer.buffers[buffer].focus) {
            Buffer.buffers[buffer].focus = false;
        }
    });
    Buffer.buffers[buffer].focus = true;
}

function switchFile(operation) {
    Buffer.buffers.forEach(buffer => {
        if (Buffer.buffers[buffer].focus) {
            const activeBuffer = Buffer.buffers[buffer];
        }
    });
    if (operation === 'next') {
        activeBuffer.switchFile('next');
    } else if (operation === 'previous') {
        activeBuffer.switchFile('previous');
    } else if (operation === 'random') {
        activeBuffer.switchFile('random');
    }
}



export { Controls, Controller };