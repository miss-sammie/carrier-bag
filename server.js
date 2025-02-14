import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { readdir } from 'node:fs/promises';
import { scanLibrary } from './api/library.js';
import { initGrid } from './api/grid.js';

console.log("Starting server initialization...");

// Load environment variables
dotenv.config();
console.log("Environment variables loaded");

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
console.log("Directory setup complete");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
console.log("Middleware setup complete");

// Serve static files from both root directory and public folder
app.use(express.static(__dirname));
app.use('/library', express.static(join(__dirname, 'public', 'library')));
console.log("Static file serving setup complete");

// Initialize grid when server starts
console.log("Attempting to initialize grid...");
try {
    await initGrid();
    console.log("Grid initialization complete");
} catch (error) {
    console.error("Error initializing grid:", error);
}

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Add API endpoint for library scanning
app.get('/api/library', async (req, res) => {
    try {
        const libraryPath = join(__dirname, 'public', 'library');
        const libraries = await readdir(libraryPath, { withFileTypes: true });
        
        const subDirs = libraries.filter(dirent => dirent.isDirectory());
        const mediaFiles = [];
        
        for (const dir of subDirs) {
            const libraryName = dir.name;
            const libraryDir = join(libraryPath, libraryName);
            const files = await readdir(libraryDir, { withFileTypes: true });
            
            files.filter(file => {
                const extension = file.name.split('.').pop().toLowerCase();
                return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'mp3', 'wav', 'ogg', 'aac', 'glb', 'gltf', 'obj'].includes(extension);
            }).forEach(file => {
                mediaFiles.push(`/library/${libraryName}/${file.name}`);
            });
        }
        
        res.json(mediaFiles);
    } catch (error) {
        console.error('Error scanning library:', error);
        res.status(500).json({ error: 'Failed to scan library' });
    }
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Serving files from: ${__dirname}`);
}); 