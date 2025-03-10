import { Controls } from './controls.js';
import { Scene } from './scene.js';

export class TextController {
    constructor() {
        this.textStates = [];
        this.currentIndex = 0;
        this.popupWindow = null;
        this.currentScene = null;
        this.isInitialized = false;
        this.authorMode = false;
        this.canvas = null;
        this.ctx = null;
        this.currentTextCache = null;
        this.textColor = 'black';  // Add default text color
    }

    async initialize(scene) {
        if (this.isInitialized) return;
        
        this.currentScene = scene;
        await this.loadTextFromHTML('text-window.html');
        this.openTextPopup();
        this.initializeCanvas();
        
        // Initialize Hydra source if available
        // if (window.s3 && typeof window.s3.init === 'function') {
        //     try {
        //         window.s3.init({src: this.canvas});
        //     } catch (error) {
        //         console.warn('Failed to initialize Hydra source s3:', error);
        //     }
        // }
        
        this.isInitialized = true;
        
        console.log('TextController initialized with', this.textStates.length, 'text states');
    }

    async loadTextFromHTML(htmlPath) {
        try {
            // If the path doesn't start with '/', assume it's relative to the library/html directory
            if (!htmlPath.startsWith('/')) {
                htmlPath = `/library/html/${htmlPath}`;
            }
            
            console.log(`Loading text from HTML file: ${htmlPath}`);
            const response = await fetch(htmlPath);
            if (!response.ok) {
                throw new Error(`Failed to load HTML file: ${htmlPath}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Find all paragraph elements
            const paragraphs = doc.querySelectorAll('p');
            
            // Clear existing text states
            this.textStates = [];
            
            // Create a text state for each paragraph
            paragraphs.forEach((p, index) => {
                const cleanedText = this.cleanHtmlText(p.innerHTML);
                if (cleanedText.trim()) {  // Only add non-empty paragraphs
                    this.textStates.push({
                        id: index,
                        text: cleanedText,
                        controlFunction: null,
                        state: null
                    });
                }
            });
            
            console.log(`Loaded ${this.textStates.length} text states from ${htmlPath}`);
            
            // If we have text states, go to the first one
            if (this.textStates.length > 0) {
                this.goToText(0);
            }
            
            return this.textStates;
        } catch (error) {
            console.error('Error loading text from HTML:', error);
            return [];
        }
    }

    cleanHtmlText(html) {
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    openTextPopup() {
        if (this.popupWindow == null || this.popupWindow.closed) {
            this.popupWindow = window.open('text-window.html', 'popup', 'width=600,height=400');
            this.popupWindow.onload = () => {
                // Send initial text once popup is loaded
                if (this.textStates.length > 0) {
                    this.sendTextToPopup(this.textStates[0].text);
                }
            };
        } else {
            this.popupWindow.focus();
        }
    }

    initializeCanvas() {
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'text-canvas';
        
        // Set canvas style - keep it hidden but still rendered
        Object.assign(this.canvas.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '-100',
            pointerEvents: 'none',
            margin: '0',
            padding: '0',
            transform: 'none',
            visibility: 'hidden'  // Use visibility: hidden instead of display: none
        });
        
        // Set actual canvas dimensions to match window
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Get context and set default text style
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.ctx.font = '24px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';
        
        // Add canvas directly to body as first child
        document.body.insertBefore(this.canvas, document.body.firstChild);
        
        // Initialize Hydra source with this canvas if it exists
        if (window.s3 && typeof window.s3.init === 'function') {
            try {
                window.s3.init({src: this.canvas});
                console.log('Initialized Hydra source s3 with text canvas');
            } catch (error) {
                console.warn('Failed to initialize Hydra source s3:', error);
            }
        }
        
        // NO resize event listener - we'll only update when text changes
    }

    updateCanvasText(text) {
        if (!this.ctx || !this.canvas || !text) return;
        
        console.log('Updating canvas text with:', text.substring(0, 30) + '...');
        
        // Update canvas dimensions to current window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Reset text style after canvas resize using current color
        this.ctx.fillStyle = this.textColor;
        
        const words = text.split(' ');
        const maxWidth = this.canvas.width * 0.8;  // Use canvas width, not window width
        const maxHeight = this.canvas.height * 0.8; // Use canvas height, not window height
        
        // Binary search to find the optimal font size
        let minSize = 12;
        let maxSize = 200;
        let optimalSize = minSize;
        let lines = [];
        
        while (minSize <= maxSize) {
            const fontSize = Math.floor((minSize + maxSize) / 2);
            this.ctx.font = `${fontSize}px Arial`;
            
            // Try to wrap text with current font size
            let currentLine = '';
            const testLines = [];
            
            for (const word of words) {
                const testLine = currentLine + word + ' ';
                const metrics = this.ctx.measureText(testLine);
                
                if (metrics.width > maxWidth) {
                    testLines.push(currentLine);
                    currentLine = word + ' ';
                } else {
                    currentLine = testLine;
                }
            }
            testLines.push(currentLine);
            
            // Calculate total height
            const lineHeight = fontSize * 1.2;
            const totalHeight = testLines.length * lineHeight;
            
            if (totalHeight > maxHeight) {
                maxSize = fontSize - 1;
            } else {
                optimalSize = fontSize;
                lines = testLines;
                minSize = fontSize + 1;
            }
        }
        
        // Set up final text rendering
        this.ctx.font = `${optimalSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        const lineHeight = optimalSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        
        // Calculate vertical center
        const canvasCenterY = this.canvas.height / 2;
        const startY = canvasCenterY - (totalHeight / 2);
        
        // Draw each line
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (trimmedLine) {
                this.ctx.fillText(
                    trimmedLine,
                    this.canvas.width / 2,
                    startY + (index * lineHeight)
                );
            }
        });
        
        // // Force Hydra to update by reinitializing s3 with our canvas
        // if (window.s3 && typeof window.s3.init === 'function') {
        //     try {
        //         window.s3.init({src: this.canvas});
        //         console.log('Reinitialized Hydra source s3 with text canvas');
        //     } catch (error) {
        //         console.warn('Failed to reinitialize Hydra source s3:', error);
        //     }
        // }
    }

    sendTextToPopup(text) {
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.postMessage({ 
                action: 'updateText', 
                text: this.cleanHtmlText(text)
            }, window.location.origin);
        } else {
            console.warn('Popup window is not available');
        }
        
        // Update canvas text
        this.updateCanvasText(this.cleanHtmlText(text));
    }

    // Set a control function for a specific text state
    setControlFunction(textIndex, functionName, ...args) {
        if (textIndex === undefined) {
            textIndex = this.currentIndex;
        }
        
        if (textIndex < 0 || textIndex >= this.textStates.length) {
            console.error(`Invalid text index: ${textIndex}`);
            return false;
        }
        
        if (typeof Controls[functionName] !== 'function') {
            console.error(`Invalid control function: ${functionName}`);
            return false;
        }
        
        this.textStates[textIndex].controlFunction = {
            name: functionName,
            args: args
        };
        
        console.log(`Set control function "${functionName}" for text state ${textIndex}`);
        this.logCurrentState();
        return true;
    }

    // Capture the current scene state and associate it with a text state
    async captureStateForText(textIndex, stateName = null) {
        if (textIndex === undefined) {
            textIndex = this.currentIndex;
        }
        
        // Try to get the scene from window.scene if this.currentScene is not available
        if (!this.currentScene && window.scene) {
            this.currentScene = window.scene;
            console.log('Using global scene reference');
        }
        
        if (!this.currentScene) {
            console.error('No scene available to capture state');
            return false;
        }
        
        if (textIndex < 0 || textIndex >= this.textStates.length) {
            console.error(`Invalid text index: ${textIndex}`);
            return false;
        }
        
        // Generate a state name if not provided
        const name = stateName || `Text_${textIndex}_${new Date().toISOString().replace(/:/g, '-')}`;
        
        try {
            // Use the scene's captureState method
            await this.currentScene.captureState(name);
            
            // Store the state name in the text state
            this.textStates[textIndex].state = name;
            
            console.log(`Captured state "${name}" for text state ${textIndex}`);
            this.logCurrentState();
            return true;
        } catch (error) {
            console.error('Error capturing state:', error);
            return false;
        }
    }

    // Navigate to a specific text state and execute its associated function/state
    async goToText(index) {
        if (index < 0 || index >= this.textStates.length) {
            console.error(`Invalid text index: ${index}`);
            return false;
        }
        
        this.currentIndex = index;
        const textState = this.textStates[index];
        
        // Send the text to the popup
        this.sendTextToPopup(textState.text);
        
        // First, load the associated state if any
        if (textState.state && this.currentScene) {
            try {
                await this.currentScene.loadState(textState.state);
                console.log(`Loaded state "${textState.state}" for text state ${index}`);
            } catch (error) {
                console.error(`Error loading state "${textState.state}":`, error);
            }
        }
        
        // In author mode, log the state but still execute functions
        if (this.authorMode) {
            this.logCurrentState();
        }
        
        // Execute the associated control function if any
        if (textState.controlFunction) {
            const { name, args } = textState.controlFunction;
            try {
                await Controls[name](...args);
                console.log(`Executed control function "${name}" for text state ${index}`);
            } catch (error) {
                console.error(`Error executing control function "${name}":`, error);
            }
        }
        
        return true;
    }

    // Navigate to the next text state
    async next() {
        console.log(`Navigating to next text state from ${this.currentIndex}`);
        const nextIndex = (this.currentIndex + 1) % this.textStates.length;
        console.log(`Next index: ${nextIndex}`);
        return this.goToText(nextIndex);
    }

    // Navigate to the previous text state
    async previous() {
        console.log(`Navigating to previous text state from ${this.currentIndex}`);
        const prevIndex = (this.currentIndex - 1 + this.textStates.length) % this.textStates.length;
        console.log(`Previous index: ${prevIndex}`);
        return this.goToText(prevIndex);
    }

    // Get the current text state
    getCurrentText() {
        return this.textStates[this.currentIndex];
    }

    // Log the current state to the console in a readable format
    logCurrentState() {
        const state = this.textStates[this.currentIndex];
        console.log(`%c--- Text State ${this.currentIndex + 1}/${this.textStates.length} ---`, 'font-weight: bold; color: #4CAF50;');
        console.log(`%cText:%c ${state.text}`, 'font-weight: bold;', 'font-weight: normal;');
        
        if (state.controlFunction) {
            console.log(
                `%cFunction:%c ${state.controlFunction.name}(${state.controlFunction.args.map(arg => JSON.stringify(arg)).join(', ')})`,
                'font-weight: bold;', 'font-weight: normal; color: #2196F3;'
            );
        } else {
            console.log('%cFunction:%c None', 'font-weight: bold;', 'font-weight: normal; color: #9E9E9E;');
        }
        
        if (state.state) {
            console.log(`%cState:%c ${state.state}`, 'font-weight: bold;', 'font-weight: normal; color: #FF9800;');
        } else {
            console.log('%cState:%c None', 'font-weight: bold;', 'font-weight: normal; color: #9E9E9E;');
        }
        
        console.log('%cAvailable Commands:', 'font-weight: bold; color: #673AB7;');
        console.log('  TextController.setFunction("functionName", arg1, arg2, ...)');
        console.log('  TextController.saveState("optionalStateName")');
        console.log('  TextController.next()');
        console.log('  TextController.previous()');
        console.log('  TextController.saveSequence("sequenceName")');
    }

    // Enable author mode with global functions
    enableAuthorMode() {
        if (this.authorMode) return;
        
        this.authorMode = true;
        console.log('%cAuthor Mode Enabled', 'font-weight: bold; color: #4CAF50; font-size: 14px;');
        console.log('Use arrow keys to navigate between text states');
        console.log('Current text state details will be shown in the console');
        
        // Add keyboard event listeners
        this._keyHandler = this._handleAuthorModeKeys.bind(this);
        document.addEventListener('keydown', this._keyHandler);
        
        // Log the current state
        this.logCurrentState();
        
        // Add convenience methods directly to the global scope
        window.setFunction = (functionName, ...args) => {
            this.setControlFunction(undefined, functionName, ...args);
        };
        
        window.saveState = (stateName) => {
            this.captureStateForText(undefined, stateName);
        };
        
        window.saveSequence = (name) => {
            this.saveTextSequence(name);
        };
        
        window.next = () => {
            this.next();
        };
        
        window.previous = () => {
            this.previous();
        };
        
        window.goToText = (index) => {
            this.goToText(index);
        };
        
        window.getCurrentText = () => {
            return this.getCurrentText();
        };
        
        window.disableAuthorMode = () => {
            this.disableAuthorMode();
        };
        
        console.log('%cGlobal Commands Available:', 'font-weight: bold; color: #673AB7;');
        console.log('  setFunction("functionName", arg1, arg2, ...)');
        console.log('  saveState("optionalStateName")');
        console.log('  next()');
        console.log('  previous()');
        console.log('  goToText(index)');
        console.log('  saveSequence("sequenceName")');
        console.log('  disableAuthorMode()');
    }

    // Disable author mode and remove global functions
    disableAuthorMode() {
        if (!this.authorMode) return;
        
        this.authorMode = false;
        console.log('%cAuthor Mode Disabled', 'font-weight: bold; color: #F44336; font-size: 14px;');
        
        // Remove keyboard event listeners
        document.removeEventListener('keydown', this._keyHandler);
        
        // Remove global functions
        delete window.setFunction;
        delete window.saveState;
        delete window.saveSequence;
        delete window.next;
        delete window.previous;
        delete window.goToText;
        delete window.getCurrentText;
        delete window.disableAuthorMode;
    }

    // Handle keyboard events in author mode
    _handleAuthorModeKeys(event) {
        if (!this.authorMode) return;
        
        switch (event.key) {
            case 'ArrowRight':
                this.next();
                event.preventDefault();
                break;
            case 'ArrowLeft':
                this.previous();
                event.preventDefault();
                break;
            case 'f':
                // Prompt for function name and args
                const functionName = prompt('Enter function name:');
                if (functionName) {
                    const argsString = prompt('Enter arguments as JSON array (e.g., [1, "text", {"key": "value"}]):');
                    try {
                        const args = argsString ? JSON.parse(argsString) : [];
                        this.setControlFunction(undefined, functionName, ...args);
                    } catch (error) {
                        console.error('Invalid JSON arguments:', error);
                    }
                }
                event.preventDefault();
                break;
            case 's':
                // Prompt for state name
                const stateName = prompt('Enter state name (optional):');
                this.captureStateForText(undefined, stateName || undefined);
                event.preventDefault();
                break;
        }
    }

    // Save all text states with their associated functions and scene states
    async saveTextSequence(name) {
        if (!name) {
            name = prompt('Enter a name for this text sequence:');
            if (!name) return null;
        }
        
        try {
            // Create a simplified version of the text states that doesn't include potentially large objects
            const simplifiedTextStates = this.textStates.map(state => {
                // Create a clean copy without any potential circular references
                const cleanState = {
                    id: state.id,
                    text: state.text,
                    state: state.state // Just store the state name, not the full state object
                };
                
                // Only include control function if it exists
                if (state.controlFunction) {
                    cleanState.controlFunction = {
                        name: state.controlFunction.name,
                        args: state.controlFunction.args
                    };
                }
                
                return cleanState;
            });
            
            const sequence = {
                name,
                created: Date.now(),
                textStates: simplifiedTextStates
            };
            
            const response = await fetch(`/public/library/sequences/${name}.json`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sequence, null, 2)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save text sequence: ${await response.text()}`);
            }
            
            console.log(`Saved text sequence "${name}" with ${this.textStates.length} states`);
            return sequence;
        } catch (error) {
            console.error('Error saving text sequence:', error);
            throw error;
        }
    }

    // Load a saved text sequence
    async loadTextSequence(name) {
        try {
            const response = await fetch(`/public/library/sequences/${name}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load text sequence: ${name}`);
            }
            
            const sequence = await response.json();
            this.textStates = sequence.textStates;
            this.currentIndex = 0;
            
            console.log(`Loaded text sequence "${name}" with ${this.textStates.length} states`);
            
            // Go to the first text state
            if (this.textStates.length > 0) {
                await this.goToText(0);
            }
            
            return sequence;
        } catch (error) {
            console.error(`Error loading text sequence ${name}:`, error);
            throw error;
        }
    }

    // Clean up resources
    cleanup() {
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.close();
        }
        
        if (this.authorMode) {
            this.disableAuthorMode();
        }
        
        // Remove canvas
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        this.popupWindow = null;
        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;
    }
    
    // Update the current scene reference
    updateScene(scene) {
        if (scene) {
            this.currentScene = scene;
            console.log('TextController: Scene reference updated');
        } else {
            console.warn('TextController: Attempted to update scene with null reference');
        }
    }

    toggleTextColor(color = null) {
        if (color === 'black' || color === 'white') {
            this.textColor = color;
        } else {
            this.textColor = this.textColor === 'black' ? 'white' : 'black';
        }
        console.log('Text color set to:', this.textColor);
        // Redraw current text with new color
        const currentText = this.getCurrentText()?.text;
        if (currentText) {
            this.updateCanvasText(currentText);
        }
    }
}

// Create a singleton instance
const textController = new TextController();

// Make it globally available
window.TextController = textController;

// Add a global init function for easy setup
window.initTextAuthor = async (scene) => {
    await textController.initialize(scene);
    textController.enableAuthorMode();
    console.log('%cText Author Mode Ready!', 'font-weight: bold; color: #4CAF50; font-size: 16px;');
    return textController;
};

export default textController; 