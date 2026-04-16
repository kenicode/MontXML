const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Basic API route (if needed for the 'Jason' part)
app.get('/api/status', (req, res) => {
    res.json({ status: 'running', message: 'Servidor do Robô Fiscal está ON' });
});

// Route for the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server on 0.0.0.0 to be accessible on local network
app.listen(PORT, '0.0.0.0', () => {
    console.log('--------------------------------------------------');
    console.log('  🤖 ROBÔ FISCAL - SERVIDOR ATIVO');
    console.log(`  🏠 Local: http://localhost:${PORT}`);
    console.log(`  📱 Rede: http://192.168.1.6:${PORT}`);
    console.log('--------------------------------------------------');
    console.log('  Abra o link da Rede no seu celular!');
});
