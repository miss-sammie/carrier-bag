import { Controls } from './controls.js';
import { Scene } from './scene.js';

class TextController {
    constructor() {
        this.textStates = [];
        this.currentIndex = 0;
        this.popupWindow = null;
        this.currentScene = null;
        this.isInitialized = false;
        this.authorMode = false;
    }

    async initialize(scene) {
        if (this.isInitialized) return;
        
        this.currentScene = scene;
        await this.loadTextFromHTML('text-window.html');
        this.openTextPopup();
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

    sendTextToPopup(text) {
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.postMessage({ 
                action: 'updateText', 
                text: this.cleanHtmlText(text)
            }, window.location.origin);
        } else {
            console.warn('Popup window is not available');
        }
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
        
        // In author mode, just log the state without executing functions
        if (this.authorMode) {
            this.logCurrentState();
            return true;
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
        
        // Load the associated state if any
        if (textState.state && this.currentScene) {
            try {
                await this.currentScene.loadState(textState.state);
                console.log(`Loaded state "${textState.state}" for text state ${index}`);
            } catch (error) {
                console.error(`Error loading state "${textState.state}":`, error);
            }
        }
        
        return true;
    }

    // Navigate to the next text state
    async next() {
        const nextIndex = (this.currentIndex + 1) % this.textStates.length;
        return this.goToText(nextIndex);
    }

    // Navigate to the previous text state
    async previous() {
        const prevIndex = (this.currentIndex - 1 + this.textStates.length) % this.textStates.length;
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
            const sequence = {
                name,
                created: Date.now(),
                textStates: this.textStates
            };
            
            const response = await fetch(`/library/text-sequences/${name}.json`, {
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
            const response = await fetch(`/library/text-sequences/${name}.json`);
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
        this.disableAuthorMode();
        if (this.popupWindow && !this.popupWindow.closed) {
            this.popupWindow.close();
        }
        this.popupWindow = null;
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