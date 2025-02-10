import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from the periphone directory
app.use(express.static(__dirname));

// Special route to list JSON files in the library directory
app.get('/library/', (req, res) => {
    const libraryPath = path.join(__dirname, 'library');
    
    try {
        const files = fs.readdirSync(libraryPath);
        const jsonFiles = files.filter(file => file.startsWith('library-') && file.endsWith('.json'));
        
        // Return a simple HTML page with links to the files
        const fileLinks = jsonFiles.map(file => `<a href="/library/${file}">${file}</a>`).join('\n');
        res.send(fileLinks);
    } catch (error) {
        console.error('Error reading library directory:', error);
        res.status(500).send('Error reading library directory');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 