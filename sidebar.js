import { mediaLibrary, collections } from './media.js';
import { Buffer } from './buffers.js';
import { toggleOverlay, toggleConsole, setPauseTime } from './sheSpeaks.js';
import { Controls } from './controls.js';

export class Sidebar {
    constructor() {
        this.element = null;
        this.libraries = new Set(); // Track loaded libraries
        this.createSidebar();
        this.initializeEventListeners();
        this.initializeKeyboardControls();
        this.visible = true; // Add this to track visibility
    }

    initializeKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    createSidebar() {
        // Create sidebar container
        this.element = document.createElement('div');
        this.element.className = 'sidebar';
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .sidebar {
                width: 250px;
                height: 100vh;
                background: #e4e4e479;
                color: #fff;
                padding: 20px;
                font-family: system-ui, -apple-system, sans-serif;
                position: fixed;
                right: 0;
                top: 0;
                z-index: 1000;
                display: block;
            }

            .section {
                margin-bottom: 20px;
            }

            .section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                background: #ece9e989;
                cursor: pointer;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 600;
                text-transform: uppercase;
            }

            .section-content {
                display: none;
                padding: 10px;
                margin-left: 10px;
                border-left: 1px solid #333;
            }

            .section-content.active {
                display: block;
            }

            .item {
                padding: 8px;
                margin: 4px 0;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
                border-radius: 4px;
            }

            .item:hover {
                background: #333;
            }

            .add-button {
                display: flex;
                align-items: center;
                padding: 8px;
                margin-top: 8px;
                cursor: pointer;
                font-size: 14px;
                color: #888;
            }

            .add-button:hover {
                color: #fff;
            }

            .chevron {
                transition: transform 0.3s;
            }

            .section.active .chevron {
                transform: rotate(90deg);
            }

            .control-group {
                margin: 10px 0;
                color: #333;
            }

            .toggle {
                display: flex;
                align-items: center;
                cursor: pointer;
            }

            .toggle input[type="checkbox"] {
                margin-right: 8px;
            }

            .label {
                font-size: 14px;
            }

            input[type="number"] {
                width: 80px;
                padding: 4px;
                margin-left: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
            }

            .buffer-container {
                margin-bottom: 8px;
            }

            .buffer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .buffer-settings {
                display: none;
                padding: 8px;
                margin-left: 16px;
                border-left: 1px solid #333;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 4px;
            }

            .buffer-container.active .buffer-settings {
                display: block;
            }

            .buffer-container.active .chevron {
                transform: rotate(90deg);
            }

            .buffer-setting {
                margin: 8px 0;
            }

            .buffer-setting label {
                display: block;
                margin-bottom: 4px;
                font-size: 12px;
                color: #333;
            }

            .collection-select, .speed-select {
                width: 100%;
                padding: 4px;
                background: #fff;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 12px;
                color: #333;
            }

            input[type="range"] {
                width: 100%;
                margin: 8px 0;
            }

            .speed-value {
                display: block;
                margin-top: 4px;
                font-size: 12px;
                color: #333;
            }
        `;
        document.head.appendChild(style);

        // Create sections
        this.element.innerHTML = `
            <!-- Libraries Section -->
            <div class="section">
                <div class="section-header">
                    <span>Libraries</span>
                    <span class="chevron">›</span>
                </div>
                <div class="section-content">
                    ${this.renderLibraries()}
                </div>
            </div>

            <!-- Collections Section -->
            <div class="section">
                <div class="section-header">
                    <span>Collections</span>
                    <span class="chevron">›</span>
                </div>
                <div class="section-content">
                    ${this.renderCollections()}
                    <div class="add-button">+ Add Collection</div>
                </div>
            </div>

            <!-- Buffers Section -->
            <div class="section">
                <div class="section-header">
                    <span>Buffers</span>
                    <span class="chevron">›</span>
                </div>
                <div class="section-content">
                    ${this.renderBuffers()}
                    <div class="add-button">+ Add Buffer</div>
                </div>
            </div>

            <!-- Text Section -->
            <div class="section">
                <div class="section-header">
                    <span>Text</span>
                    <span class="chevron">›</span>
                </div>
                <div class="section-content">
                    <div class="control-group">
                        <label class="toggle">
                            <input type="checkbox" id="overlay-toggle" checked>
                            <span class="label">Overlay</span>
                        </label>
                    </div>
                    <div class="control-group">
                        <label class="toggle">
                            <input type="checkbox" id="console-toggle" checked>
                            <span class="label">Console</span>
                        </label>
                    </div>
                    <div class="control-group">
                        <label>
                            <span class="label">Speed (ms)</span>
                            <input type="range" id="pause-time" 
                                value="4000" 
                                min="500" 
                                max="5000" 
                                step="100">
                            <span class="speed-value">4000ms</span>
                        </label>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        // Add event listeners
        const overlayToggle = document.getElementById('overlay-toggle');
        const consoleToggle = document.getElementById('console-toggle');
        const pauseTimeInput = document.getElementById('pause-time');
        const speedValue = pauseTimeInput.nextElementSibling;

        overlayToggle.addEventListener('change', () => {
            toggleOverlay();
        });

        consoleToggle.addEventListener('change', () => {
            toggleConsole();
        });

        pauseTimeInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            speedValue.textContent = `${value}ms`;
            setPauseTime(value);
        });
    }

    renderLibraries() {
        if (this.libraries.size === 0) return '';
        return Array.from(this.libraries)
            .map(name => `
                <div class="item" data-library="${name}">
                    ${name}
                </div>
            `).join('');
    }

    // Add library to the list
    addLibrary(filename) {
        // Extract name between 'library-' and '.json'
        const match = filename.match(/library-(.+?)\.json/i);
        if (match) {
            this.libraries.add(match[1]);
            this.update();
        }
    }

    renderCollections() {
        if (!collections) return '';
        return Array.from(collections.entries())
            .map(([name, collection]) => `
                <div class="item" data-collection="${name}">
                    ${name} (${collection.items.length} items)
                </div>
            `).join('');
    }

    renderBuffers() {
        if (!Buffer.buffers) return '';
        return Buffer.buffers
            .map((buffer, index) => `
                <div class="buffer-container">
                    <div class="item buffer-header" data-buffer="${index}">
                        Buffer ${index} (${buffer.type || 'unset'})
                        <span class="chevron">›</span>
                    </div>
                    <div class="buffer-settings">
                        <div class="buffer-setting">
                            <label>Collection:</label>
                            <select class="collection-select" data-buffer="${index}">
                                <option value="">Select Collection</option>
                                ${Array.from(collections.keys())
                                    .map(name => `<option value="${name}" 
                                        ${buffer.collection === name ? 'selected' : ''}>
                                        ${name}
                                    </option>`)
                                    .join('')}
                            </select>
                        </div>
                        <div class="buffer-setting">
                            <label>Playback Speed:</label>
                            <select class="speed-select" data-buffer="${index}">
                                ${Controls.speeds.map(speed => 
                                    `<option value="${speed}" 
                                        ${buffer.element?.playbackRate === speed ? 'selected' : ''}>
                                        ${speed}x
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>
            `).join('');
    }

    initializeEventListeners() {
        // Remove any existing event listeners
        const oldHeaders = this.element.querySelectorAll('.section-header');
        oldHeaders.forEach(header => {
            const newHeader = header.cloneNode(true);
            header.parentNode.replaceChild(newHeader, header);
        });

        // Section header click handlers
        this.element.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.parentElement;
                const content = section.querySelector('.section-content');
                
                // Toggle this section
                section.classList.toggle('active');
                content.classList.toggle('active');
            });
        });

        // Collection click handlers
        this.element.querySelectorAll('[data-collection]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                const collectionName = item.dataset.collection;
                console.log('Selected collection:', collectionName);
            });
        });

        // Buffer click handlers for expand/collapse
        this.element.querySelectorAll('.buffer-header').forEach(header => {
            header.addEventListener('click', (e) => {
                e.stopPropagation();
                const container = header.closest('.buffer-container');
                container.classList.toggle('active');
            });
        });

        // Collection select handlers
        this.element.querySelectorAll('.collection-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const bufferIndex = parseInt(e.target.dataset.buffer);
                const selectedCollection = e.target.value;
                const buffer = Buffer.buffers[bufferIndex];
                
                if (buffer && selectedCollection) {
                    try {
                        buffer.setCollection(selectedCollection);
                        console.log(`Set buffer ${bufferIndex} collection to:`, selectedCollection);
                        
                        // Update the UI after collection is set and first media is loaded
                        setTimeout(() => this.update(), 100);
                    } catch (error) {
                        console.error('Failed to set collection:', error);
                    }
                }
            });
        });

        // Speed select handlers
        this.element.querySelectorAll('.speed-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const bufferIndex = parseInt(e.target.dataset.buffer);
                const speed = parseFloat(e.target.value);
                const buffer = Buffer.buffers[bufferIndex];
                if (buffer.element) {
                    buffer.element.playbackRate = speed;
                    console.log(`Setting buffer ${bufferIndex} playback speed to: ${speed}x`);
                }
            });
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.element.style.display = this.visible ? 'block' : 'none';
    }

    update() {
        // Update libraries content
        const librariesContent = this.element.querySelector('.section:first-child .section-content');
        librariesContent.innerHTML = this.renderLibraries();

        // Update collections content
        const collectionsContent = this.element.querySelector('.section:nth-child(2) .section-content');
        collectionsContent.innerHTML = this.renderCollections() + 
            '<div class="add-button">+ Add Collection</div>';

        // Update buffers content
        const buffersContent = this.element.querySelector('.section:nth-child(3) .section-content');
        buffersContent.innerHTML = this.renderBuffers() + 
            '<div class="add-button">+ Add Buffer</div>';

        // Reinitialize event listeners
        this.initializeEventListeners();
    }
}

