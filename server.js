// server.js - Simple Express server
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public')); // Serve static files from public folder

// In-memory storage (resets on server restart - perfect for testing)
let quizResults = [];

// Serve quiz page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Submit quiz result
app.post('/api/submit-quiz', (req, res) => {
    const result = req.body;
    result.id = Date.now(); // Simple ID
    result.submitted_at = new Date().toISOString();
    
    quizResults.push(result);
    console.log(`New quiz submission from: ${result.participant_name}`);
    
    res.json({ success: true, id: result.id });
});

// API: Get all results (for admin)
app.get('/api/results', (req, res) => {
    res.json(quizResults);
});

// API: Clear all results
app.delete('/api/results', (req, res) => {
    quizResults = [];
    res.json({ success: true });
});

// API: Download CSV
app.get('/api/download-csv', (req, res) => {
    if (quizResults.length === 0) {
        return res.status(404).json({ error: 'No data available' });
    }

    // Convert to CSV
    const headers = Object.keys(quizResults[0]);
    const csvContent = [
        headers.join(','),
        ...quizResults.map(row => 
            headers.map(header => `"${row[header] || ''}"`).join(',')
        )
    ].join('\n');

    const filename = `quiz_results_${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});