const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'quiz.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// Middleware
app.use(express.json({ limit: '10mb' }));

// API: Clear all data (for testing)
app.delete('/api/results', (req, res) => {
    console.log('🗑️ Admin requesting to clear all data');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    db.run("DELETE FROM quiz_results", (err) => {
        if (err) {
            console.error('❌ Error clearing data:', err.message);
            res.status(500).json({ error: 'Database error' });
        } else {
            console.log('✅ All quiz results cleared successfully');
            res.json({ success: true, message: 'All data cleared' });
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
