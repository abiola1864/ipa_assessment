const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// MongoDB connection
let db;
let client;

// Initialize MongoDB database
async function initDatabase() {
    try {
        const mongoURL = process.env.MONGODB_URI || 'mongodb+srv://oyebanjoabiola:LXSFwPsvyX1bHdpl@ipa-assessments.hv3ni9r.mongodb.net/ipa_quiz';
        client = new MongoClient(mongoURL);
        
        await client.connect();
        db = client.db('ipa_quiz');
        
        console.log('✅ Connected to MongoDB database');
        
        // Create collection and indexes
        const collection = db.collection('quiz_results');
        
        // Create indexes for better query performance
        await collection.createIndex({ "participant_name": 1 });
        await collection.createIndex({ "completed_at": -1 });
        await collection.createIndex({ "percentage": -1 });
        
        console.log('✅ Database collection ready');
        
    } catch (err) {
        console.error('❌ Database initialization error:', err);
        throw err;
    }
}

// Routes

// Serve main quiz page
app.get('/', (req, res) => {
    console.log('📄 Serving main quiz page');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Health check
app.get('/api/health', async (req, res) => {
    try {
        if (!db) {
            throw new Error('Database not initialized');
        }
        
        // Test database connection
        await db.admin().ping();
        
        res.json({ 
            status: 'OK', 
            message: 'Database connected and operational',
            timestamp: new Date().toISOString(),
            database: 'MongoDB'
        });
    } catch (err) {
        console.error('❌ Database health check failed:', err);
        res.status(500).json({ 
            status: 'ERROR', 
            message: 'Database connection failed',
            timestamp: new Date().toISOString(),
            error: err.message
        });
    }
});

// API: Submit quiz result
app.post('/api/submit-quiz', async (req, res) => {
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
    
    try {
        const collection = db.collection('quiz_results');
        
        // Prepare document for MongoDB - much cleaner structure
        const quizDocument = {
            participant_name: data.participant_name,
            completed_at: new Date(data.completed_at),
            total_score: data.total_score,
            percentage: data.percentage,
            time_taken: data.time_taken || null,
            questions: {},
            created_at: new Date()
        };
        
        // Store questions in a cleaner nested structure
        for (let i = 1; i <= 20; i++) {
            quizDocument.questions[`Q${i}`] = {
                user_answer: data[`Q${i}`] || '',
                correct_answer: data[`Q${i}_correct`] || '',
                skill: data[`Q${i}_skill`] || '',
                category: data[`Q${i}_category`] || '',
                is_correct: data[`Q${i}`] === data[`Q${i}_correct`]
            };
        }
        
        // Insert into MongoDB
        const result = await collection.insertOne(quizDocument);
        
        console.log(`✅ Quiz saved successfully! ID: ${result.insertedId}, Participant: ${data.participant_name}`);
        res.json({ 
            success: true, 
            id: result.insertedId,
            message: 'Quiz results saved successfully',
            participant: data.participant_name
        });
        
    } catch (err) {
        console.error('❌ Database error:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API: Get all results (for admin dashboard)
app.get('/api/results', async (req, res) => {
    console.log('📊 Admin requesting all results');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const collection = db.collection('quiz_results');
        const results = await collection.find({}).sort({ completed_at: -1 }).toArray();
        
        // Convert MongoDB results to match your frontend expectations
        const formattedResults = results.map(doc => {
            const formatted = {
                id: doc._id,
                participant_name: doc.participant_name,
                completed_at: doc.completed_at.toISOString(),
                total_score: doc.total_score,
                percentage: doc.percentage,
                time_taken: doc.time_taken,
                created_at: doc.created_at.toISOString()
            };
            
            // Flatten questions for compatibility with existing frontend
            for (let i = 1; i <= 20; i++) {
                const q = doc.questions[`Q${i}`] || {};
                formatted[`Q${i}`] = q.user_answer || '';
                formatted[`Q${i}_correct`] = q.correct_answer || '';
                formatted[`Q${i}_skill`] = q.skill || '';
                formatted[`Q${i}_category`] = q.category || '';
            }
            
            return formatted;
        });
        
        console.log(`✅ Returning ${formattedResults.length} results`);
        res.json(formattedResults);
        
    } catch (err) {
        console.error('❌ Database error:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API: Get statistics
app.get('/api/stats', async (req, res) => {
    console.log('📈 Admin requesting statistics');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const collection = db.collection('quiz_results');
        
        // Use MongoDB aggregation pipeline for efficient stats
        const statsAggregation = await collection.aggregate([
            {
                $facet: {
                    total: [{ $count: "count" }],
                    average: [{ $group: { _id: null, avg_score: { $avg: "$percentage" } } }],
                    excellent: [{ $match: { percentage: { $gte: 80 } } }, { $count: "count" }],
                    today: [
                        { 
                            $match: { 
                                completed_at: { 
                                    $gte: new Date(new Date().toISOString().split('T')[0]) 
                                } 
                            } 
                        }, 
                        { $count: "count" }
                    ]
                }
            }
        ]).toArray();
        
        const stats = statsAggregation[0];
        
        const result = {
            total: stats.total[0]?.count || 0,
            average_score: Math.round(stats.average[0]?.avg_score || 0),
            excellent_count: stats.excellent[0]?.count || 0,
            today_count: stats.today[0]?.count || 0
        };
        
        console.log('✅ Stats calculated:', result);
        res.json(result);
        
    } catch (err) {
        console.error('❌ Database error:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API: Enhanced CSV download
app.get('/api/download-csv', async (req, res) => {
    console.log('💾 Admin requesting enhanced CSV download');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const collection = db.collection('quiz_results');
        const results = await collection.find({}).sort({ completed_at: -1 }).toArray();
        
        if (results.length === 0) {
            console.log('⚠️ No data available for CSV download');
            res.status(404).json({ error: 'No data available' });
            return;
        }
        
        // Enhanced CSV with calculated fields
        const enhancedRows = results.map(doc => {
            // Calculate category scores
            const categories = {
                'Data Analysis': [1,2,3,4,5,6,7,8],
                'M&E': [9,10,11,12,13],
                'RCT/Impact': [14,15,16],
                'Programming Logic': [17,18,19,20]
            };
            
            const categoryScores = {};
            Object.entries(categories).forEach(([category, questionNums]) => {
                let correct = 0;
                questionNums.forEach(qNum => {
                    const q = doc.questions[`Q${qNum}`];
                    if (q && q.is_correct) {
                        correct++;
                    }
                });
                const cleanCategory = category.toLowerCase().replace(/[^a-z]/g, '_');
                categoryScores[cleanCategory + '_score'] = correct;
                categoryScores[cleanCategory + '_percentage'] = Math.round((correct / questionNums.length) * 100);
            });
            
            // Flatten the document for CSV
            const flattened = {
                id: doc._id,
                participant_name: doc.participant_name,
                completed_at: doc.completed_at.toISOString(),
                total_score: doc.total_score,
                percentage: doc.percentage,
                time_taken: doc.time_taken,
                time_taken_minutes: doc.time_taken ? Math.round(doc.time_taken / 60) : null,
                performance_level: doc.percentage >= 80 ? 'Excellent' : doc.percentage >= 60 ? 'Good' : 'Needs Improvement',
                created_at: doc.created_at.toISOString(),
                ...categoryScores
            };
            
            // Add individual question data
            for (let i = 1; i <= 20; i++) {
                const q = doc.questions[`Q${i}`] || {};
                flattened[`Q${i}`] = q.user_answer || '';
                flattened[`Q${i}_correct`] = q.correct_answer || '';
                flattened[`Q${i}_skill`] = q.skill || '';
                flattened[`Q${i}_category`] = q.category || '';
                flattened[`Q${i}_is_correct`] = q.is_correct || false;
            }
            
            return flattened;
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
        
    } catch (err) {
        console.error('❌ Error generating CSV:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API: Clear all data (for testing)
app.delete('/api/results', async (req, res) => {
    console.log('🗑️ Admin requesting to clear all data');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const collection = db.collection('quiz_results');
        const result = await collection.deleteMany({});
        
        console.log(`✅ Cleared ${result.deletedCount} quiz results successfully`);
        res.json({ success: true, message: `All data cleared (${result.deletedCount} records)` });
        
    } catch (err) {
        console.error('❌ Error clearing data:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    if (client) {
        await client.close();
        console.log('✅ Database connection closed.');
    }
    process.exit(0);
});

// Initialize database and start server
initDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Quiz available at: http://localhost:${PORT}`);
            console.log(`👨‍💼 Admin panel at: http://localhost:${PORT}/admin.html`);
            console.log(`💾 Database: MongoDB (persistent)`);
            console.log('✅ System ready for quiz submissions (20 questions)');
            
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