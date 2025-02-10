let letterCount = 0
let sendCount = 5
let nextText = ''
let pause = 4000
let pausing = false
let noVowel = false
let vowelCount = 0
let consonantCount = 0
let noConsonant = false
let caps = false

// Add the new state variables
let overlayVisible = true;
let consoleEnabled = true;
let pauseTime = 4000;
let lexicon = new Set();
let textOverlayArray = [];
let popupWindow = null;
let displayMode = 'overlay';
const MAX_OVERLAY_TEXTS = 10;

// Add initialization function
export function initBabbler(mode = 'overlay') {
    // Set initial display mode based on parameter
    switch(mode) {
        case 'overlay':
            displayMode = 'overlay';
            initializeTextOverlay();
            break;
        case 'popup':
            displayMode = 'popup';
            createPopupWindow();
            break;
        case 'both':
            displayMode = 'both';
            initializeTextOverlay();
            createPopupWindow();
            break;
        case 'none':
            displayMode = 'none';
            break;
    }

    // Load lexicon
    loadLexicon();

    // Start the FFT update loop
    setTimeout(() => {
        function update() {
            const fftData = a.fft;
            if (fftData) {
                frequencyToLetter(fftData);
            }
            requestAnimationFrame(update);
        }
        update();
    }, 2000);
}

// Add the control functions
export function setDisplayMode(mode) {
    if (mode === displayMode) return;
    
    displayMode = mode;
    
    const container = document.getElementById('textOverlayContainer');
    
    switch(mode) {
        case 'popup':
            // Hide overlay
            if (container) {
                container.style.display = 'none';
            }
            // Create popup if needed
            if (!popupWindow || popupWindow.closed) {
                createPopupWindow();
            }
            break;
            
        case 'overlay':
            // Close popup
            if (popupWindow && !popupWindow.closed) {
                popupWindow.close();
            }
            // Show overlay
            if (container) {
                container.style.display = 'flex';
            }
            break;
            
        case 'both':
            // Show overlay
            if (container) {
                container.style.display = 'flex';
            }
            // Create popup if needed
            if (!popupWindow || popupWindow.closed) {
                createPopupWindow();
            }
            break;
            
        case 'none':
            // Hide both
            if (container) {
                container.style.display = 'none';
            }
            if (popupWindow && !popupWindow.closed) {
                popupWindow.close();
            }
            break;
    }
}

function createPopupWindow() {
    const width = 600;
    const height = 800;
    const left = window.screen.width - width;
    const top = 0;
    
    popupWindow = window.open('', 'TextWindow', 
        `width=${width},height=${height},left=${left},top=${top}`);
    
    // Add styles and container to popup
    popupWindow.document.head.innerHTML = `
        <style>
            body {
                margin: 0;
                padding: 20px;
                background: white;
                color: black;
                font-family: monospace;
                font-size: 72px;
                overflow-y: auto;
                height: 100vh;
                box-sizing: border-box;
            }
            .text-container {
                display: flex;
                flex-direction: column-reverse;
                justify-content: flex-start;
                min-height: 100%;
                gap: 10px;
            }
            .text-item {
                word-wrap: break-word;
            }
            .highlight {
                color: red;
                font-weight: bold;
                font-size: 130%;
                margin: 0 0.2em;
            }
        </style>
    `;
    
    popupWindow.document.body.innerHTML = '<div class="text-container"></div>';
}

export function toggleOverlay() {
    overlayVisible = !overlayVisible;
    const container = document.getElementById('textOverlayContainer');
    if (container) {
        container.style.display = overlayVisible ? 'flex' : 'none';
    }
}

export function toggleConsole() {
    consoleEnabled = !consoleEnabled;
}

export function getPauseTime() {
    return {
        pauseTime
    }

}

export function setPauseTime(time) {
    pauseTime = time;
    console.log('Pause time set to:', pauseTime);
}

// Add the dictionary loading function
async function loadLexicon() {
    try {
        const response = await fetch('lexicon.txt');
        const text = await response.text();
        lexicon = new Set(text.split('\n').map(word => word.trim()));
        console.log('Lexicon loaded with', lexicon.size, 'words');
        console.log(lexicon)
    } catch (error) {
        console.error('Failed to load lexicon:', error);
    }
}

function findWordsInText(text) {
    let foundWords = [];
    
    // Convert Set to Array and sort by length (longest first)
    const sortedWords = [...lexicon]
        .filter(word => word.length >= 2)
        .sort((a, b) => b.length - a.length);
    
    sortedWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
            const newWord = {
                word: word,
                start: match.index,
                end: match.index + word.length
            };
            
            // Check if this word overlaps with any existing found words
            const hasOverlap = foundWords.some(existing => 
                (newWord.start >= existing.start && newWord.start < existing.end) ||
                (newWord.end > existing.start && newWord.end <= existing.end)
            );
            
            if (!hasOverlap) {
                foundWords.push(newWord);
            }
        }
    });
    
    return foundWords;
}

// Add function to create and initialize the overlay container
function initializeTextOverlay() {
    const overlayContainer = document.createElement('div');
    overlayContainer.id = 'textOverlayContainer';
    overlayContainer.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 25vw;
        transform: translateX(-50%);
        z-index: 1;
        pointer-events: none;
        color: white;
        font-family: monospace;
        text-align: left;
        height: 80vh;
        width: 50vw;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        font-size: 72px;
    `;
    document.body.appendChild(overlayContainer);

    // Create initial empty text elements
    for (let i = 0; i < MAX_OVERLAY_TEXTS; i++) {
        const textElement = document.createElement('div');
        textElement.style.cssText = `
            transition: transform 0.5s ease;
            margin-bottom: 10px;
            white-space: nowrap;
            overflow: visible;
        `;
        textElement.textContent = '';
        overlayContainer.appendChild(textElement);
        textOverlayArray.push(textElement);
    }
}

// Modify postText to handle both overlay and popup modes
function postText(text) {
    pausing = false;
    
    // Find words and create highlighted version
    const foundWords = findWordsInText(text);
    let displayText = text;
    
    if (foundWords.length > 0) {
        // Sort words from last to first to maintain indices
        foundWords.sort((a, b) => b.start - a.start);
        
        // Create highlighted version
        foundWords.forEach(({word, start, end}) => {
            const before = displayText.slice(0, start);
            const highlighted = displayText.slice(start, end);
            const after = displayText.slice(end);
            displayText = `${before}<span class="highlight">${highlighted}</span>${after}`;
        });
    }
    
    // Update overlay if visible
    if ((displayMode === 'overlay' || displayMode === 'both') && overlayVisible) {
        textOverlayArray.shift().remove();
        const newText = document.createElement('div');
        newText.style.cssText = `
            transition: transform 0.5s ease;
            margin-bottom: 10px;
            white-space: nowrap;
            overflow: visible;
        `;
        newText.innerHTML = displayText;
        textOverlayArray.push(newText);
        document.getElementById('textOverlayContainer').appendChild(newText);
    }
    
    // Update popup if it exists
    if ((displayMode === 'popup' || displayMode === 'both') && popupWindow && !popupWindow.closed) {
        const container = popupWindow.document.querySelector('.text-container');
        if (container) {
            const textElement = popupWindow.document.createElement('div');
            textElement.className = 'text-item';
            textElement.innerHTML = displayText;
            
            // Insert at the beginning to maintain bottom-to-top order
            if (container.firstChild) {
                container.insertBefore(textElement, container.firstChild);
            } else {
                container.appendChild(textElement);
            }
            
            // Remove old texts if too many
            while (container.children.length > MAX_OVERLAY_TEXTS) {
                container.removeChild(container.lastChild);
            }
            
            // Scroll to top (where new text appears)
            popupWindow.scrollTo(0, 0);
        }
    }
    
    // Log to console if enabled
    if (consoleEnabled) {
        if (foundWords.length > 0) {
            let highlightedText = text;
            const styles = [];
            foundWords.forEach(({start, end}) => {
                highlightedText = 
                    highlightedText.slice(0, start) + 
                    ' %c' + highlightedText.slice(start, end) + ' %c' +
                    highlightedText.slice(end);
                styles.push(
                    'color: red; font-weight: bold; font-size: 14pt;',
                    ''
                );
            });
            console.error(highlightedText, ...styles);
        } else {
            console.log(text);
        }
    }
    
    letterCount = 0;
    nextText = '';  
    sendCount = Math.floor(Math.random() * 23) + 1;
    pause = pauseTime;
}

// Call initializeTextOverlay when the script starts
initializeTextOverlay();
loadLexicon();

function randomLetter(operator) {
    const letters = 'TBTRROOHEHYSODDIMBINEOPAIDFRRDSAEIASEEUNVXRTJOLVRTAOLAAIOZCIANGUTFNEQEYAUPCGLLOKAEENWEEIIIWESGUTNM';
    const vowels = 'OEEAEEAOAEOIEUIOIIAAIOAIOEIAOOUIUEEAAEIEUE'
    const consonants = "TZDQHWDNTTSGBRMNLDTRVDSSRLFYRFPWRLLGCNPCJXRHKYNGTTNMNSVB";
    if(operator === 'vowel' && noVowel === false) {
        vowelCount += 1
        if(vowelCount > 3){
            noVowel = true
            vowelCount = 0
        }
        return vowels[Math.floor(Math.random() * vowels.length)];
    } else if (operator === 'consonant' && noConsonant === false) {
        consonantCount += 1
        if(consonantCount > 3) {
            noConsonant = true
            consonantCount = 0
        }
        return consonants[Math.floor(Math.random() * consonants.length)];
    } else if (operator === 'consonant' && noConsonant === true) {
        noConsonant = false
        return vowels[Math.floor(Math.random() * vowels.length)];
    } else if (operator === 'vowel' && noVowel === true) {
        noVowel = false
        return consonants[Math.floor(Math.random() * consonants.length)];
    } else {
        return letters[Math.floor(Math.random() * letters.length)];
    }
}

function frequencyToLetter(fftData) {
    // Check if fftData exists and has values
    if (!fftData || !fftData.length) {
        console.log('Waiting for audio data...');
        return;
    }

    // Define threshold for frequency activation
    const thresholdA = 0.35; // Adjust this value based on your needs
    const thresholdB = 0.5;

    // Map of indices to letters
    const letters = 'TBTRROOHEHYSODD IMBINEOPAIDFR RDSAEIASE EUNVX RTJOLVRTAOLA AIOZCIANGUTFNE QEYAUPCGLLOKAEEN WEEIIIWESGUTNM';
    
    // Check each frequency band
    fftData.forEach((amplitude, index) => {
        if (amplitude > thresholdB && index < 4) {
            caps = true
        } else if (amplitude > thresholdA && amplitude < thresholdB && index < 4) {
            caps = false
        }

       // setInterval(() => console.log(fftData), 3000)
        //setInterval(() => console.log(amplitude, index), 3000)
        
        

        if (letterCount === sendCount && !pausing) {
            pausing = true
            setTimeout(() => postText(nextText), pause);
        } else if (letterCount < sendCount && !pausing) {
            if(index === 0) {   
                if(caps === true) {       
                    nextText += randomLetter()
                } else {
                    nextText += randomLetter().toLowerCase()
                }
            } else if (index === 1) {
                if(caps === true) {
                    nextText += randomLetter('vowel')
                } else {
                    nextText += randomLetter('vowel').toLowerCase()   
                }
            } else if (index === 2)     {
                if(caps === true) {
                    nextText += randomLetter('consonant')
                } else {
                    nextText += randomLetter('consonant').toLowerCase()
                }
            } else if (index === 3) {
                if(caps === true) {
                    nextText += randomLetter('consonant')
                } else {
                    nextText += randomLetter('consonant').toLowerCase()
                }            }
            letterCount += 1
        } else if (pausing) {
            return
        }
        
        
    
    })
    
}

// Export the functions we need in other files
export { frequencyToLetter, initializeTextOverlay, postText};