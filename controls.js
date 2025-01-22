import { Buffer } from './buffers.js';
import { reloadPatch } from './periphone.js';
import { MediaObject, mediaLibrary, getCollection } from './media.js';


class Controls {
    static timeOperations = ['forward', 'backward', 'reset', 'random'];
    static speedOperations = ['faster', 'slower', 'normal'];
    static speeds = [0.25,0.5, 1, 2, 4];
    static switchOperations = ['next', 'prev', 'random'];

    static keyMapping = {
        'Digit1': () => Controls.focus(0),
        'Digit2': () => Controls.focus(1),
        'Digit3': () => Controls.focus(2),
        'Digit4': () => Controls.focus(3),
        'KeyQ': () => Controls.switchFile('next'),
        'KeyW': () => Controls.switchFile('previous'),
        'KeyE': () => Controls.switchFile('random'),
    
    };
    
    static init() {
        Object.entries(this.keyMapping).forEach(([key, handler]) => {
            document.addEventListener('keyup', (event) => {
                if (event.code === key) {
                    handler();
                }
            });
        });
        console.log('Controls initialized');
    }

    static switchFile(buffer, direction = 'next') {
        const focusedBuffer = Buffer.buffers.find(b => b.focus);
        if (!focusedBuffer) {
            console.warn('No buffer focused');
            return;
        }

        console.log(`Switching file for buffer ${focusedBuffer.slot}, current collection:`, focusedBuffer.currentCollection);

        if (!focusedBuffer.currentCollection) {
            console.error('No collection set for this buffer');
            return;
        }
    
        const length = focusedBuffer.currentCollection.length;
        
        if (direction === 'next') {
            focusedBuffer.currentIndex = (focusedBuffer.currentIndex + 1) % length;
        } else if (direction === 'prev') {
            focusedBuffer.currentIndex = (focusedBuffer.currentIndex - 1 + length) % length;
        } else if (direction === 'random') {
            focusedBuffer.currentIndex = Math.floor(Math.random() * length);
        }
    
        const mediaObj = focusedBuffer.currentCollection[focusedBuffer.currentIndex];
        console.log(`Buffer ${focusedBuffer.slot} switching to ${mediaObj.title} (${focusedBuffer.currentIndex + 1}/${length})`);
        
        // Load the new media
        const element = focusedBuffer.loadMedia(mediaObj.url);
        
        // Ensure video plays if it's a video
        if (focusedBuffer.filetype === 'video' && focusedBuffer.element) {
            try {
                focusedBuffer.element.play().catch(e => {
                    console.log(`Auto-play handled for buffer ${focusedBuffer.slot} during switch`);
                });
            } catch (e) {
                console.log(`Play failed for buffer ${focusedBuffer.slot} during switch`);
            }
        }

        // Reload patch if needed
        if (typeof reloadPatch === 'function') {
            reloadPatch();
        }
    
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

    static focus(buffer) {
        Buffer.buffers.forEach(b => {
            if (b.focus) {
                b.focus = false;
            }
        });
        Buffer.buffers[buffer].focus = true;
    }

    static init() {
        Object.entries(this.keyMapping).forEach(([key, handler]) => {
            document.addEventListener('keyup', (event) => {
                if (event.code === key) {
                    handler();
                }
            });
        });
        console.log('Controls initialized');
    }
}







export { Controls };