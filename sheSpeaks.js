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

// At the top with other variables
let lexicon = new Set();

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

function postText(text) {
    pausing = false;
    
    const foundWords = findWordsInText(text);
    if (foundWords.length > 0) {
        // Start with the original text
        let highlightedText = text;
        const styles = [];
        
        // Sort found words by position from end to start
        foundWords.sort((a, b) => b.start - a.start);
        
        // Insert style markers and collect styles
        foundWords.forEach(({start, end}) => {
            highlightedText = 
                highlightedText.slice(0, start) + 
                ' %c' + highlightedText.slice(start, end) + ' %c' +
                highlightedText.slice(end);
            
            // Add the style for this word and the reset style
            styles.push(
                'color: red; font-weight: bold; font-size: 14pt;',
                ''  // Reset style
            );
        });
        
        console.error(highlightedText, ...styles);
    } else {
        console.log(text);
    }
    
    letterCount = 0;
    nextText = '';  
    sendCount = Math.floor(Math.random() * 23) + 1;
    pause = Math.floor(Math.random() * 1000) + 299;
}

// Call loadLexicon when the script starts
loadLexicon();

// function postText(text) {
//     pausing = false
//     console.error(text)
//     letterCount = 0
//     nextText = ''  
//     sendCount = Math.floor(Math.random() * 13) + 1
//     pause = Math.floor(Math.random() * 5000) + 299
// }

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

        //console.log(amplitude, index)
        
        
        
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
        
        
        
        //     if (letterCount === sendCount && !pausing) {
        //         pausing = true
        //         setTimeout(() => postText(nextText), pause);
        //     } else if (letterCount < sendCount && !pausing) {
        //         if(index === 0) {           
        //             nextText += randomLetter()
        //         } else if (index === 1) {
        //             nextText += randomLetter('vowel')   
        //         } else if (index === 2)     {
        //             nextText += randomLetter('consonant')
        //         } else if (index === 3) {
        //             nextText += ' '
        //         }
        //         letterCount += 1
        //     } else if (pausing) {
        //         return
        //     }
        // }
    });
}

// Export the functions we need in other files
export { frequencyToLetter };