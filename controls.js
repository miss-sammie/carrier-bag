import { Buffer } from './buffer.js';

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

class Slot {
    constructor(bufferNumber) {
        this.buffer = Buffer.buffers[bufferNumber];
        this.focus = false;
        this.active = false;    
    }
}

const slots = [];

function initSlots(visualCount, audioCount) {
    for (let i = 0; i < visualCount; i++) {
        slots.push(new Slot(i));
    }
    for (let i = 0; i < audioCount; i++) {
        slots.push(new Slot(i));
    }  
    return slots;
}


const keyMapping = {
    'Digit1': () => focus(Slot.slots[0]),
    'Digit2': () => focus(Slot.slots[1]),
    'Digit3': () => focus(Slot.slots[2]),
    'Digit4': () => focus(Slot.slots[3]),
    'Digit5': () => focus(Slot.slots[4]),
    'Digit6': () => focus(Slot.slots[5]),
    'KeyQ': () => switchFile('next'),
    'KeyW': () => switchFile('previous'),
    'KeyE': () => switchFile('random'),
    'KeyR': () => switchParam('blend'),

};

function focus(slotNumber) {
    Slot.slots.forEach(slotNumber  => {
        if (Slot.slots[slotNumber].focus) {
            Slot.slots[slotNumber].focus = false;
        }
    });
    Slot.slots[slotNumber].focus = true;
}

function switchFile(operation) {
    
    if (operation === 'next') {
    } else if (operation === 'previous') {
    } else if (operation === 'random') {
    }
}

function switchParam(param, operation) {
    if (param === 'blend') {
        if (operation === 'next') {
        } else if (operation === 'previous') {
        } else if (operation === 'random') {
        }
    }
}


