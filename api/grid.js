import monomeGrid from 'monome-grid';
import { WebSocketServer } from 'ws';

let grid = null;
let gridEnabled = false;
let wss = null;

async function initGrid() {
    console.log("Starting grid initialization...");
    
    try {
        // Set up WebSocket server first
        wss = new WebSocketServer({ port: 8080 });
        console.log('WebSocket server created');

        // Try to initialize grid
        grid = await monomeGrid();

        if (!grid) {
            console.log('No grid device found, continuing without grid support');
            return false;
        }

        gridEnabled = true;
        console.log('Grid connected successfully');

        wss.on('connection', (ws) => {
            console.log('Client connected to grid');

            if (grid) {
                grid.key((x, y, s) => {
                    ws.send(JSON.stringify({
                        type: 'gridKey',
                        x, y, s
                    }));
                });

                ws.on('message', (message) => {
                    const data = JSON.parse(message);
                    if (data.type === 'ledUpdate') {
                        grid.refresh(data.led);
                    }
                });
            }
        });

        return true;
    } catch (error) {
        console.warn('Failed to initialize Grid:', error);
        gridEnabled = false;
        return false;
    }
}

export { initGrid }; 