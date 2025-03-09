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
import multer from 'multer';
import { networkInterfaces } from 'os';
import path from 'path';
import fetch from 'node-fetch';
import { pipeline } from 'stream/promises';

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.use(express.static(join(__dirname, 'public')));
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

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Store all uploads in the uploads folder
        const dest = path.join(__dirname, 'public', 'library', 'uploads');
        cb(null, dest);
    },
    filename: function (req, file, cb) {
        // Generate unique filename while preserving extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 500 * 1024 * 1024, // 500MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept video, audio, and image files
        const type = file.mimetype.split('/')[0];
        if (['video', 'audio', 'image'].includes(type)) {
            cb(null, true);
        } else {
            cb(new Error('Only video, audio, and image files are allowed'));
        }
    }
});

// Make sure uploads directory exists
const uploadsDir = join(__dirname, 'public', 'library', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
}

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Add API endpoint for library scanning
app.get('/api/library', async (req, res) => {
    try {
        const folders = req.query.folders ? JSON.parse(req.query.folders) : null;
        const includeSubdirectories = req.query.includeSubdirectories === 'true';
        const mediaFiles = await scanLibrary(folders, includeSubdirectories);
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

// Create sequences directory if it doesn't exist
const sequencesDir = join(__dirname, 'public', 'library', 'sequences');
if (!fs.existsSync(sequencesDir)) {
    fs.mkdirSync(sequencesDir, { recursive: true });
    console.log('Created sequences directory:', sequencesDir);
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

// Add API endpoint for saving/updating a text sequence
app.put('/public/library/sequences/:sequenceName.json', async (req, res) => {
    try {
        const { sequenceName } = req.params;
        const sequencePath = join(__dirname, 'public', 'library', 'sequences', `${sequenceName}.json`);
        
        // Ensure the directory exists
        if (!fs.existsSync(sequencesDir)) {
            fs.mkdirSync(sequencesDir, { recursive: true });
        }
        
        // Write the file
        await fs.promises.writeFile(sequencePath, JSON.stringify(req.body, null, 2));
        res.json({ status: 'ok', message: `Text sequence ${sequenceName} saved successfully` });
    } catch (error) {
        console.error('Error saving text sequence:', error);
        res.status(500).json({ error: 'Failed to save text sequence' });
    }
});

// Add API endpoint for loading a text sequence
app.get('/public/library/sequences/:sequenceName.json', async (req, res) => {
    try {
        const { sequenceName } = req.params;
        const sequencePath = join(__dirname, 'public', 'library', 'sequences', `${sequenceName}.json`);
        
        if (!fs.existsSync(sequencePath)) {
            return res.status(404).json({ error: `Text sequence ${sequenceName} not found` });
        }
        
        const sequence = await fs.promises.readFile(sequencePath, 'utf8');
        res.json(JSON.parse(sequence));
    } catch (error) {
        console.error('Error loading text sequence:', error);
        res.status(500).json({ error: 'Failed to load text sequence' });
    }
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});

// Modify upload endpoint
app.post('/upload', (req, res) => {
    upload.single('file')(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({
                success: false,
                error: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                error: err.message
            });
        }

        try {
            if (!req.file) {
                throw new Error('No file uploaded');
            }

            // Construct the relative path
            const relativePath = `/library/uploads/${req.file.filename}`;

            // Trigger media library refresh to update collections
            await scanLibrary();

            res.json({
                success: true,
                file: req.file.filename,
                path: relativePath
            });
        } catch (error) {
            console.error('Upload error:', error);
            res.status(400).json({
                success: false,
                error: error.message
            });
        }
    });
});

// Add explicit route for upload page
app.get('/upload.html', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'upload.html'));
});

// Add API endpoint for fetching remote media
app.post('/api/fetch-remote-media', async (req, res) => {
    try {
        const { remoteUrl, endpoint, targetFolder } = req.body;
        
        console.log(`Fetching remote media from: ${remoteUrl}${endpoint}`);
        
        // Fetch the list of media from the remote server
        const remoteResponse = await fetch(`${remoteUrl}${endpoint}`);
        
        if (!remoteResponse.ok) {
            throw new Error(`Remote API error: ${remoteResponse.status}`);
        }
        
        const remoteMedia = await remoteResponse.json();
        console.log(`Found ${remoteMedia.length} media items on remote server`);
        
        // Create target directory if it doesn't exist
        const targetDir = join(__dirname, 'public', 'library', targetFolder);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
            console.log(`Created target directory: ${targetDir}`);
        }
        
        // Download each file
        const downloadedFiles = [];
        
        for (const item of remoteMedia) {
            const mediaUrl = item.url;
            const filename = path.basename(mediaUrl);
            const localPath = join(targetDir, filename);
            
            // Skip if file already exists
            if (fs.existsSync(localPath)) {
                console.log(`File already exists: ${filename}`);
                continue;
            }
            
            // Download the file
            console.log(`Downloading ${mediaUrl} to ${localPath}`);
            const fileResponse = await fetch(mediaUrl);
            
            if (!fileResponse.ok) {
                console.error(`Failed to download ${mediaUrl}: ${fileResponse.status}`);
                continue;
            }
            
            // Save the file
            await pipeline(
                fileResponse.body,
                fs.createWriteStream(localPath)
            );
            
            downloadedFiles.push({
                originalUrl: mediaUrl,
                localUrl: `/library/${targetFolder}/${filename}`,
                filename
            });
        }
        
        console.log(`Successfully downloaded ${downloadedFiles.length} files`);
        
        // Trigger media library refresh to update collections
        await scanLibrary();
        
        res.json({
            success: true,
            downloadedCount: downloadedFiles.length,
            downloadedFiles
        });
        
    } catch (error) {
        console.error('Error fetching remote media:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Add API endpoint for listing HTML files
app.get('/api/html-files', async (req, res) => {
    try {
        const htmlDir = join(__dirname, 'public', 'library', 'html');
        
        // Create the directory if it doesn't exist
        if (!fs.existsSync(htmlDir)) {
            fs.mkdirSync(htmlDir, { recursive: true });
            console.log(`Created directory: ${htmlDir}`);
        }
        
        const files = await readdir(htmlDir, { withFileTypes: true });
        const htmlFiles = files
            .filter(file => !file.isDirectory() && file.name.toLowerCase().endsWith('.html'))
            .map(file => file.name);
        
        res.json(htmlFiles);
    } catch (error) {
        console.error('Error scanning HTML files:', error);
        res.status(500).json({ error: 'Failed to scan HTML files' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

// Get local IP address
function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip internal and non-IPv4 addresses
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

// Start server
const ip = getLocalIP();

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://${ip}:${port}`);
    console.log(`Upload page available at http://${ip}:${port}/upload.html`);
}); 