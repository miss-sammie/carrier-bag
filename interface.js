
export class UIGrid {
    constructor() {
        this.visible = false;
        this.grid = null;
        this.cells = [];
        this.rows = 4;
        this.cols = 4;
        this.components = new Map();
        this.createGrid();
        this.initializeKeyboardControls();
    }

    createGrid() {
        // Create main grid container
        this.grid = document.createElement('div');
        this.grid.className = 'ui-grid';
        this.grid.style.display = 'none';
        
        // Create grid cells
        for (let i = 0; i < this.rows; i++) {
            const row = [];
            for (let j = 0; j < this.cols; j++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                this.grid.appendChild(cell);
                row.push(cell);
            }
            this.cells.push(row);
        }
        
        document.body.appendChild(this.grid);
        console.log("UIGrid created");
    }

    initializeKeyboardControls() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    toggle() {
        this.visible = !this.visible;
        this.grid.style.display = this.visible ? 'grid' : 'none';
    }

    // Add a component to a specific cell
    addComponent(row, col, ComponentClass, ...args) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            const cell = this.cells[row][col];
            const componentInstance = new ComponentClass(cell, ...args);
            this.components.set(`${row}-${col}`, componentInstance);
            componentInstance.mount();
        }
    }
}

// Base Component Class
export class UIComponent {
    constructor(container) {
        this.container = container;
        this.element = null;
    }

    mount() {
        this.element = this.render();
        this.container.appendChild(this.element);
        this.afterMount();
    }

    render() {
        // Override in child classes
        return document.createElement('div');
    }

    afterMount() {
        // Override in child classes for post-mount operations
    }

    update() {
        // Override in child classes
        // Called when component needs to update its state
    }
}

// Example Buffer Status Component
export class BufferStatusComponent extends UIComponent {
    constructor(container, buffer) {
        super(container);
        this.buffer = buffer;
    }

    render() {
        const element = document.createElement('div');
        element.className = 'buffer-status';
        this.updateContent(element);
        return element;
    }

    updateContent(element) {
        const playbackRate = this.buffer.element && this.buffer.element.playbackRate !== undefined
            ? this.buffer.element.playbackRate
            : 'N/A';

        const currentIndex = this.buffer.currentIndex;

        element.innerHTML = `
            <div class="buffer-info">
                <div>Buffer ${this.buffer.slot}</div>
                <div>Filetype: ${this.buffer.filetype}</div>
                <div>Speed: ${playbackRate}</div>
                <div>Focus: ${this.buffer.focus}</div>
                <div>Index: ${currentIndex}</div>

                
            </div>
        `;
    }

    update() {
        if (this.element) {
            this.updateContent(this.element);
        }
    }
}