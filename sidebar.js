import { mediaLibrary, collections } from './media.js';
import { Buffer } from './buffers.js';

export class Sidebar {
    constructor() {
        this.element = null;
        this.libraries = new Set(); // Track loaded libraries
        this.createSidebar();
        this.initializeEventListeners();
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
        `;

        document.body.appendChild(this.element);
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
                <div class="item" data-buffer="${index}">
                    Buffer ${index} (${buffer.type || 'unset'})
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

        // Buffer click handlers
        this.element.querySelectorAll('[data-buffer]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling up
                const bufferIndex = parseInt(item.dataset.buffer);
                console.log('Selected buffer:', bufferIndex);
            });
        });
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