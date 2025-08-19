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
let db;

// Initialize database with error handling
function initDatabase() {
    return new Promise((resolve, reject) => {
        db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to SQLite database');
                
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
                    )`, (err) => {
                        if (err) {
                            console.error('❌ Error creating table:', err.message);
                            reject(err);
                        } else {
                            console.log('✅ Database table ready');
                            resolve();
                        }
                    });
                });
            }
        });
    });
}

// Routes

// Serve main quiz page
app.get('/', (req, res) => {
    console.log('📄 Serving main quiz page');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Health check
app.get('/api/health', (req, res) => {
    if (!db) {
        return res.status(500).json({ 
            status: 'ERROR', 
            message: 'Database not initialized',
            timestamp: new Date().toISOString()
        });
    }
    
    // Test database connection
    db.get("SELECT 1 as test", [], (err, row) => {
        if (err) {
            console.error('❌ Database health check failed:', err);
            res.status(500).json({ 
                status: 'ERROR', 
                message: 'Database connection failed',
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({ 
                status: 'OK', 
                message: 'Database connected and operational',
                timestamp: new Date().toISOString(),
                database: 'SQLite'
            });
        }
    });
});

// API: Submit quiz result
app.post('/api/submit-quiz', (req, res) => {
    console.log('📝 Received quiz submission from:', req.body.participant_name);
    
    if (!db) {
        console.error('❌ Database not available');
        return res.status(500).json({ error: 'Database not available' });
    }
    
    const data = req.body;
    
    // Validate required fields
    if (!data.participant_name || data.total_score === undefined || data.percentage === undefined) {
        console.error('❌ Invalid submission data');
        return res.status(400).json({ error: 'Invalid data', details: 'Missing required fields' });
    }
    
    // Database schema has: 5 basic + 60 question fields = 65 columns (excluding auto-generated id and created_at)
    // We need exactly 65 placeholders and 65 values
    
    // Prepare SQL statement - EXACTLY 65 placeholders for 65 columns
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    // EXACTLY 65 values to match 65 columns
    const values = [
        // Basic fields (5)
        data.participant_name,
        data.completed_at,
        data.total_score,
        data.percentage,
        data.time_taken || null,
        // Q1-Q15 fields (60 = 15 questions × 4 fields each)
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
    
    // Verify counts match exactly
    const placeholderCount = (sql.match(/\?/g) || []).length;
    console.log(`📊 Database columns to insert: 65`);
    console.log(`📊 SQL placeholders: ${placeholderCount}`);
    console.log(`📊 Values provided: ${values.length}`);
    
    if (placeholderCount !== 65) {
        console.error(`❌ SQL ERROR: Expected exactly 65 placeholders, found ${placeholderCount}`);
        return res.status(500).json({ 
            error: 'SQL configuration error', 
            details: `Expected 65 placeholders, found ${placeholderCount}`
        });
    }
    
    if (values.length !== 65) {
        console.error(`❌ DATA ERROR: Expected exactly 65 values, got ${values.length}`);
        return res.status(500).json({ 
            error: 'Data configuration error', 
            details: `Expected 65 values, got ${values.length}`
        });
    }
    
    console.log('✅ Placeholder and value counts match - proceeding with database insert');
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('❌ Database error:', err.message);
            res.status(500).json({ error: 'Database error', details: err.message });
        } else {
            console.log(`✅ Quiz saved successfully! ID: ${this.lastID}, Participant: ${data.participant_name}`);
            res.json({ 
                success: true, 
                id: this.lastID,
                message: 'Quiz results saved successfully',
                participant: data.participant_name
            });
        }
    });
});

// API: Get all results (for admin dashboard)
app.get('/api/results', (req, res) => {
    console.log('📊 Admin requesting all results');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    db.all("SELECT * FROM quiz_results ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error('❌ Database error:', err.message);
            res.status(500).json({ error: 'Database error' });
        } else {
            console.log(`✅ Returning ${rows.length} results`);
            res.json(rows);
        }
    });
});

// API: Get statistics
app.get('/api/stats', (req, res) => {
    console.log('📈 Admin requesting statistics');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    const stats = {};
    
    // Get total count
    db.get("SELECT COUNT(*) as total FROM quiz_results", (err, row) => {
        if (err) {
            console.error('❌ Error getting total:', err.message);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        
        stats.total = row.total;
        
        // Get average score
        db.get("SELECT AVG(percentage) as avg_score FROM quiz_results", (err, row) => {
            if (err) {
                console.error('❌ Error getting average:', err.message);
                res.status(500).json({ error: 'Database error' });
                return;
            }
            
            stats.average_score = Math.round(row.avg_score || 0);
            
            // Get today's count
            const today = new Date().toISOString().split('T')[0];
            db.get("SELECT COUNT(*) as today_count FROM quiz_results WHERE DATE(created_at) = ?", [today], (err, row) => {
                if (err) {
                    console.error('❌ Error getting today count:', err.message);
                    res.status(500).json({ error: 'Database error' });
                    return;
                }
                
                stats.today_count = row.today_count;
                
                // Get excellent count (80%+)
                db.get("SELECT COUNT(*) as excellent_count FROM quiz_results WHERE percentage >= 80", (err, row) => {
                    if (err) {
                        console.error('❌ Error getting excellent count:', err.message);
                        res.status(500).json({ error: 'Database error' });
                        return;
                    }
                    
                    stats.excellent_count = row.excellent_count;
                    console.log('✅ Stats calculated:', stats);
                    res.json(stats);
                });
            });
        });
    });
});

// API: Get detailed analytics
app.get('/api/analytics', (req, res) => {
    console.log('📊 Admin requesting detailed analytics');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    db.all("SELECT * FROM quiz_results ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching analytics data:', err.message);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        
        if (rows.length === 0) {
            res.json({
                skillAreas: [],
                participantAnalysis: [],
                strengthsAndGaps: { strengths: [], gaps: [] },
                capacityBuildingPlan: []
            });
            return;
        }
        
        // Define skill areas for capacity building
        const skillAreaMapping = {
            'Excel Skills': ['Excel - Pivot Tables', 'Excel - Data Cleaning', 'Excel - Lookup Functions', 'Excel - Formulas'],
            'Power BI & Visualization': ['Power BI - Visualization', 'Power BI - DAX'],
            'Statistical Understanding': ['Statistical Understanding', 'Data Interpretation'],
            'Data Management': ['Data Cleaning Concepts', 'Data Types', 'Data Handling Concepts'],
            'Programming Logic': ['Conditional Statements', 'Iteration Logic', 'Boolean Logic'],
            'Algorithm & Problem Solving': ['Algorithm Logic']
        };
        
        // Calculate performance by skill area
        const skillAreaPerformance = {};
        Object.keys(skillAreaMapping).forEach(area => {
            skillAreaPerformance[area] = {
                name: area,
                totalQuestions: 0,
                totalCorrect: 0,
                participantScores: [],
                averagePercentage: 0
            };
        });
        
        // Calculate individual participant performance
        const participantAnalysis = rows.map(participant => {
            const analysis = {
                name: participant.participant_name,
                id: participant.id,
                totalScore: participant.total_score,
                percentage: participant.percentage,
                skillAreas: {}
            };
            
            // Initialize skill areas for this participant
            Object.keys(skillAreaMapping).forEach(area => {
                analysis.skillAreas[area] = { correct: 0, total: 0, percentage: 0 };
            });
            
            // Calculate performance by skill area for this participant
            for (let i = 1; i <= 15; i++) {
                const userAnswer = participant[`Q${i}`];
                const correctAnswer = participant[`Q${i}_correct`];
                const skill = participant[`Q${i}_skill`];
                
                // Find which skill area this question belongs to
                for (const [area, skills] of Object.entries(skillAreaMapping)) {
                    if (skills.includes(skill)) {
                        analysis.skillAreas[area].total++;
                        skillAreaPerformance[area].totalQuestions++;
                        
                        if (userAnswer === correctAnswer) {
                            analysis.skillAreas[area].correct++;
                            skillAreaPerformance[area].totalCorrect++;
                        }
                        break;
                    }
                }
            }
            
            // Calculate percentages for this participant
            Object.keys(analysis.skillAreas).forEach(area => {
                const areaData = analysis.skillAreas[area];
                areaData.percentage = areaData.total > 0 ? Math.round((areaData.correct / areaData.total) * 100) : 0;
                skillAreaPerformance[area].participantScores.push(areaData.percentage);
            });
            
            return analysis;
        });
        
        // Calculate average percentages for skill areas
        Object.keys(skillAreaPerformance).forEach(area => {
            const areaData = skillAreaPerformance[area];
            if (areaData.participantScores.length > 0) {
                areaData.averagePercentage = Math.round(
                    areaData.participantScores.reduce((sum, score) => sum + score, 0) / areaData.participantScores.length
                );
            }
        });
        
        // Convert to array and sort by performance
        const skillAreasArray = Object.values(skillAreaPerformance).sort((a, b) => a.averagePercentage - b.averagePercentage);
        
        // Identify strengths (top 2) and gaps (bottom 2)
        const gaps = skillAreasArray.slice(0, 2);
        const strengths = skillAreasArray.slice(-2);
        
        // Generate capacity building plan
        const capacityBuildingPlan = [
            {
                priority: 'High Priority',
                areas: gaps.map(area => ({
                    name: area.name,
                    currentLevel: area.averagePercentage + '%',
                    targetLevel: '80%',
                    recommendedActions: getRecommendations(area.name)
                }))
            },
            {
                priority: 'Medium Priority',
                areas: skillAreasArray.slice(2, -2).map(area => ({
                    name: area.name,
                    currentLevel: area.averagePercentage + '%',
                    targetLevel: '85%',
                    recommendedActions: getRecommendations(area.name)
                }))
            },
            {
                priority: 'Maintain Excellence',
                areas: strengths.map(area => ({
                    name: area.name,
                    currentLevel: area.averagePercentage + '%',
                    targetLevel: '90%+',
                    recommendedActions: ['Advanced training', 'Peer mentoring opportunities', 'Complex project assignments']
                }))
            }
        ];
        
        console.log('✅ Analytics calculated successfully');
        
        res.json({
            skillAreas: skillAreasArray,
            participantAnalysis,
            strengthsAndGaps: { strengths, gaps },
            capacityBuildingPlan
        });
    });
});

// Helper function for recommendations
function getRecommendations(skillArea) {
    const recommendations = {
        'Excel Skills': [
            'Hands-on Excel workshop focusing on pivot tables and formulas',
            'Online Excel certification course',
            'Practice with real datasets'
        ],
        'Power BI & Visualization': [
            'Power BI fundamentals training',
            'Data visualization best practices workshop',
            'Dashboard design principles course'
        ],
        'Statistical Understanding': [
            'Basic statistics refresher course',
            'Data interpretation workshop',
            'Statistical thinking for analysts'
        ],
        'Data Management': [
            'Data cleaning and preparation workshop',
            'Data quality best practices training',
            'Database fundamentals course'
        ],
        'Programming Logic': [
            'Introduction to programming concepts',
            'Logic and algorithm thinking workshop',
            'Problem-solving methodology course'
        ],
        'Algorithm & Problem Solving': [
            'Algorithmic thinking workshop',
            'Problem decomposition techniques',
            'Advanced logical reasoning course'
        ]
    };
    
    return recommendations[skillArea] || ['General skills development', 'Targeted practice sessions'];
}

// API: Enhanced CSV download
app.get('/api/download-csv', (req, res) => {
    console.log('💾 Admin requesting enhanced CSV download');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    db.all("SELECT * FROM quiz_results ORDER BY created_at DESC", [], (err, rows) => {
        if (err) {
            console.error('❌ Error fetching data for CSV:', err.message);
            res.status(500).json({ error: 'Database error' });
            return;
        }
        
        if (rows.length === 0) {
            console.log('⚠️ No data available for CSV download');
            res.status(404).json({ error: 'No data available' });
            return;
        }
        
        // Enhanced CSV with calculated fields
        const enhancedRows = rows.map(row => {
            // Calculate category scores
            let dataAnalysisScore = 0;
            let programmingScore = 0;
            
            for (let i = 1; i <= 15; i++) {
                const userAnswer = row[`Q${i}`];
                const correctAnswer = row[`Q${i}_correct`];
                const category = row[`Q${i}_category`];
                
                if (category === 'Data Analysis' && userAnswer === correctAnswer) {
                    dataAnalysisScore++;
                } else if (category === 'Programming Logic' && userAnswer === correctAnswer) {
                    programmingScore++;
                }
            }
            
            return {
                ...row,
                data_analysis_score: dataAnalysisScore,
                data_analysis_percentage: Math.round((dataAnalysisScore / 10) * 100),
                programming_score: programmingScore,
                programming_percentage: Math.round((programmingScore / 5) * 100),
                performance_level: row.percentage >= 80 ? 'Excellent' : row.percentage >= 60 ? 'Good' : 'Needs Improvement',
                time_taken_minutes: row.time_taken ? Math.round(row.time_taken / 60) : null
            };
        });
        
        // Convert to CSV
        const headers = Object.keys(enhancedRows[0]);
        const csvContent = [
            headers.join(','),
            ...enhancedRows.map(row => 
                headers.map(header => `"${row[header] || ''}"`).join(',')
            )
        ].join('\n');
        
        const filename = `technical_assessment_results_enhanced_${new Date().toISOString().split('T')[0]}.csv`;
        
        console.log(`✅ Sending enhanced CSV with ${enhancedRows.length} records`);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csvContent);
    });
});

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

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...');
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing database:', err);
            } else {
                console.log('✅ Database connection closed.');
            }
            process.exit(0);
        });
    } else {
        process.exit(0);
    }
});

// Initialize database and start server
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Quiz available at: http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin panel at: http://localhost:${PORT}/admin.html`);
            console.log(`💾 Database: ${dbPath}`);
            console.log('✅ System ready for quiz submissions');
            
            // Check if public directory exists
            const publicDir = path.join(__dirname, 'public');
            if (fs.existsSync(publicDir)) {
                console.log('✅ Public directory found');
                const files = fs.readdirSync(publicDir);
                console.log('📁 Files in public:', files);
            } else {
                console.error('❌ Public directory NOT found');
            }
        });
    })
    .catch(err => {
        console.error('💥 Failed to initialize database:', err);
        process.exit(1);
    });