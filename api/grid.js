import monomeGrid from 'monome-grid';
import { WebSocketServer } from 'ws';

let grid = null;
let gridEnabled = false;
let wss = null;

async function initGrid() {
    console.log("Starting grid initialization...");
    
    try {
        // Create a promise that rejects after 1 second
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Grid connection timeout')), 1000);
        });

        // Race between grid initialization and timeout
        grid = await Promise.race([
            monomeGrid(),
            timeoutPromise
        ]);

        if (!grid) {
            console.log('No grid device found, skipping grid initialization');
            return false;
        }

        // Only set up WebSocket server if grid is connected
        wss = new WebSocketServer({ port: 8080 });
        console.log('WebSocket server created');

        gridEnabled = true;
        grid.varibright = true;
        console.log('Grid connected successfully');

        wss.on('connection', (ws) => {
            console.log('Client connected to grid');

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
        });

        return true;
    } catch (error) {
        console.warn('Failed to initialize Grid:', error);
        gridEnabled = false;
        return false;
    }
}

export { initGrid, gridEnabled }; 