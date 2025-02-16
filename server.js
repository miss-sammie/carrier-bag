import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { readdir } from 'node:fs/promises';
import { scanLibrary } from './api/library.js';
import { initGrid } from './api/grid.js';
import fs from 'fs';

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

// Configure MIME types
express.static.mime.define({
    'video/mp4': ['mp4'],
    'video/quicktime': ['mov'],
    'audio/mpeg': ['mp3'],
    'audio/wav': ['wav'],
    'audio/ogg': ['ogg'],
    'audio/aac': ['aac'],
    'image/jpeg': ['jpg', 'jpeg'],
    'image/png': ['png'],
    'image/gif': ['gif'],
    'image/webp': ['webp'],
    'model/gltf-binary': ['glb'],
    'model/gltf+json': ['gltf'],
    'model/obj': ['obj']
});

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
        const folders = req.query.folders ? JSON.parse(req.query.folders) : null;
        const libraryPath = join(__dirname, 'public', 'library');
        const libraries = await readdir(libraryPath, { withFileTypes: true });
        
        let subDirs = libraries.filter(dirent => dirent.isDirectory());
        
        // Filter directories if folders parameter is provided
        if (folders && Array.isArray(folders)) {
            subDirs = subDirs.filter(dirent => folders.includes(dirent.name));
        }
        
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

// Create playlists directory if it doesn't exist
const playlistsDir = join(__dirname, 'public', 'library', 'playlists');
if (!fs.existsSync(playlistsDir)) {
    fs.mkdirSync(playlistsDir);
}

// Add API endpoint for saving scenes
app.put('/library/scenes/:sceneName.json', async (req, res) => {
    try {
        const { sceneName } = req.params;
        const scenePath = join(__dirname, 'public', 'library', 'scenes', `${sceneName}.json`);
        
        // Write the scene file
        await fs.promises.writeFile(scenePath, JSON.stringify(req.body, null, 2));
        
        res.json({ status: 'ok', message: `Scene ${sceneName} saved successfully` });
    } catch (error) {
        console.error('Error saving scene:', error);
        res.status(500).json({ error: 'Failed to save scene' });
    }
});

// Add API endpoint for listing playlists
app.get('/library/playlists', async (req, res) => {
    try {
        const files = await fs.promises.readdir(playlistsDir);
        const playlists = files
            .filter(file => file.endsWith('.json'))
            .map(file => file.replace('.json', ''));
        res.json(playlists);
    } catch (error) {
        console.error('Error listing playlists:', error);
        res.status(500).json({ error: 'Failed to list playlists' });
    }
});

// Add API endpoint for loading a playlist
app.get('/library/playlists/:playlistName.json', async (req, res) => {
    try {
        const { playlistName } = req.params;
        const playlistPath = join(playlistsDir, `${playlistName}.json`);
        
        if (!fs.existsSync(playlistPath)) {
            return res.status(404).json({ error: `Playlist ${playlistName} not found` });
        }
        
        const playlist = await fs.promises.readFile(playlistPath, 'utf8');
        res.json(JSON.parse(playlist));
    } catch (error) {
        console.error('Error loading playlist:', error);
        res.status(500).json({ error: 'Failed to load playlist' });
    }
});

// Add API endpoint for saving/updating a playlist
app.put('/library/playlists/:playlistName.json', async (req, res) => {
    try {
        const { playlistName } = req.params;
        const playlistPath = join(playlistsDir, `${playlistName}.json`);
        
        await fs.promises.writeFile(playlistPath, JSON.stringify(req.body, null, 2));
        res.json({ status: 'ok', message: `Playlist ${playlistName} saved successfully` });
    } catch (error) {
        console.error('Error saving playlist:', error);
        res.status(500).json({ error: 'Failed to save playlist' });
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