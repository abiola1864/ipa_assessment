const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Initialize SQLite database
const dbPath = path.join(__dirname, 'quiz_results.db');
const db = new sqlite3.Database(dbPath);

// Create table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        participant_name TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        total_score INTEGER NOT NULL,
        percentage INTEGER NOT NULL,
        time_taken INTEGER,
        Q1 TEXT, Q1_correct TEXT, Q1_skill TEXT, Q1_category TEXT,
        Q2 TEXT, Q2_correct TEXT, Q2_skill TEXT, Q2_category TEXT,
        Q3 TEXT, Q3_correct TEXT, Q3_skill TEXT, Q3_category TEXT,
        Q4 TEXT, Q4_correct TEXT, Q4_skill TEXT, Q4_category TEXT,
        Q5 TEXT, Q5_correct TEXT, Q5_skill TEXT, Q5_category TEXT,
        Q6 TEXT, Q6_correct TEXT, Q6_skill TEXT, Q6_category TEXT,
        Q7 TEXT, Q7_correct TEXT, Q7_skill TEXT, Q7_category TEXT,
        Q8 TEXT, Q8_correct TEXT, Q8_skill TEXT, Q8_category TEXT,
        Q9 TEXT, Q9_correct TEXT, Q9_skill TEXT, Q9_category TEXT,
        Q10 TEXT, Q10_correct TEXT, Q10_skill TEXT, Q10_category TEXT,
        Q11 TEXT, Q11_correct TEXT, Q11_skill TEXT, Q11_category TEXT,
        Q12 TEXT, Q12_correct TEXT, Q12_skill TEXT, Q12_category TEXT,
        Q13 TEXT, Q13_correct TEXT, Q13_skill TEXT, Q13_category TEXT,
        Q14 TEXT, Q14_correct TEXT, Q14_skill TEXT, Q14_category TEXT,
        Q15 TEXT, Q15_correct TEXT, Q15_skill TEXT, Q15_category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Routes

// Serve main quiz page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Submit quiz result
app.post('/api/submit-quiz', (req, res) => {
    const data = req.body;
    
    // Prepare SQL statement
    const sql = `INSERT INTO quiz_results (
        participant_name, completed_at, total_score, percentage, time_taken,
        Q1, Q1_correct, Q1_skill, Q1_category,
        Q2, Q2_correct, Q2_skill, Q2_category,
        Q3, Q3_correct, Q3_skill, Q3_category,
        Q4, Q4_correct, Q4_skill, Q4_category,
        Q5, Q5_correct, Q5_skill, Q5_category,
        Q6, Q6_correct, Q6_skill, Q6_category,
        Q7, Q7_correct, Q7_skill, Q7_category,
        Q8, Q8_correct, Q8_skill, Q8_category,
        Q9, Q9_correct, Q9_skill, Q9_category,
        Q10, Q10_correct, Q10_skill, Q10_category,
        Q11, Q11_correct, Q11_skill, Q11_category,
        Q12, Q12_correct, Q12_skill, Q12_category,
        Q13, Q13_correct, Q13_skill, Q13_category,
        Q14, Q14_correct, Q14_skill, Q14_category,
        Q15, Q15_correct, Q15_skill, Q15_category
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        data.participant_name,
        data.completed_at,
        data.total_score,
        data.percentage,
        data.time_taken || null,
        data.Q1 || '', data.Q1_correct || '', data.Q1_skill || '', data.Q1_category || '',
        data.Q2 || '', data.Q2_correct || '', data.Q2_skill || '', data.Q2_category || '',
        data.Q3 || '', data.Q3_correct || '', data.Q3_skill || '', data.Q3_category || '',
        data.Q4 || '', data.Q4_correct || '', data.Q4_skill || '', data.Q4_category || '',
        data.Q5 || '', data.Q5_correct || '', data.Q5_skill || '', data.Q5_category || '',
        data.Q6 || '', data.Q6_correct || '', data.Q6_skill || '', data.Q6_category || '',
        data.Q7 || '', data.Q7_correct || '', data.Q7_skill || '', data.Q7_category || '',
        data.Q8 || '', data.Q8_correct || '', data.Q8_skill || '', data.Q8_category || '',
        data.Q9 || '', data.Q9_correct || '', data.Q9_skill || '', data.Q9_category || '',
        data.Q10 || '', data.Q10_correct || '', data.Q10_skill || '', data.Q10_category || '',
        data.Q11 || '', data.Q11_correct || '', data.Q11_skill || '', data.Q11_category || '',
        data.Q12 || '', data.Q12_correct || '', data.Q12_skill || '', data.Q12_category || '',
        data.Q13 || '', data.Q13_correct || '', data.Q13_skill || '', data.Q13_category || '',
        data.Q14 || '', data.Q14_correct || '', data.Q14_skill || '', data.Q14_category || '',
        data.Q15 || '', data.Q15_correct || '', data.Q15_skill || '', data.Q15_category || ''
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error', details: err.message });
        } else {
            console.log(`New quiz submission from: ${data.participant_name} (ID: ${this.lastID})`);
            res.json({ 
                success: true, 
                id: this.lastID,
                message: 'Quiz results saved successfully'
            });
        }
    });
});

// API: Get all results (for admin dashboard)
app.get('/api/results', (req, res) => {
    db.all("SELECT * FROM quiz_results ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ error: 'Database error' });
        } else {
            res.json(rows);
        }
    });
});

// API: Get statistics
app.get('/api/stats', (req, res) => {
    const stats = {};
    
    // Get total count
    db.get("SELECT COUNT(*) as total FROM quiz_results", (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        
        stats.total = row.total;
        
        // Get average score
        db.get("SELECT AVG(percentage) as avg_score FROM quiz_results", (err, row) => {
            if (err) {
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            stats.average_score = Math.round(row.avg_score || 0);
            
            // Get today's count
            const today = new Date().toISOString().split('T')[0];
            db.get("SELECT COUNT(*) as today_count FROM quiz_results WHERE DATE(created_at) = ?", [today], (err, row) => {
                if (err) {
                    res.status(500).json({ error: 'Database error' });
                    return;
                }
                
                stats.today_count = row.today_count;
                
                // Get excellent count (80%+)
                db.get("SELECT COUNT(*) as excellent_count FROM quiz_results WHERE percentage >= 80", (err, row) => {
                    if (err) {
                        res.status(500).json({ error: 'Database error' });
                        return;
                    }
                    
                    stats.excellent_count = row.excellent_count;
                    res.json(stats);
                });
            });
        });
    });
});

// API: Download CSV
app.get('/api/download-csv', (req, res) => {
    db.all("SELECT * FROM quiz_results ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        
        if (rows.length === 0) {
            res.status(404).json({ error: 'No data available' });
            return;
        }
        
        // Convert to CSV
        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => 
                headers.map(header => `"${row[header] || ''}"`).join(',')
            )
        ].join('\n');
        
        const filename = `technical_assessment_results_${new Date().toISOString().split('T')[0]}.csv`;
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    });
});

// API: Clear all data (for testing)
app.delete('/api/results', (req, res) => {
    db.run("DELETE FROM quiz_results", (err) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
        } else {
            console.log('All quiz results cleared');
            res.json({ success: true, message: 'All data cleared' });
        }
    });
});

// API: Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        database: 'Connected'
    });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Quiz available at: http://localhost:${PORT}`);
    console.log(`👨‍💼 Admin panel at: http://localhost:${PORT}/admin.html`);
    console.log(`💾 Database: ${dbPath}`);
});