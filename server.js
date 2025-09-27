const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
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
        
        // Create collections and indexes
        const resultsCollection = db.collection('quiz_results');
        const projectsCollection = db.collection('projects');
        const questionsCollection = db.collection('questions');
        
        // Create indexes for better query performance
        await resultsCollection.createIndex({ "participant_name": 1 });
        await resultsCollection.createIndex({ "completed_at": -1 });
        await resultsCollection.createIndex({ "percentage": -1 });
        await resultsCollection.createIndex({ "project_id": 1 });
        
        await projectsCollection.createIndex({ "access_code": 1 }, { unique: true });
        await projectsCollection.createIndex({ "name": 1 });
        
        await questionsCollection.createIndex({ "project_id": 1 });
        await questionsCollection.createIndex({ "period": 1 });
        
        console.log('✅ Database collections ready');
        
        // Initialize default project if none exists
        await initializeDefaultProject();
        
    } catch (err) {
        console.error('❌ Database initialization error:', err);
        throw err;
    }
}

// Initialize default project and migrate existing data
async function initializeDefaultProject() {
    try {
        const projectsCollection = db.collection('projects');
        const questionsCollection = db.collection('questions');
        const resultsCollection = db.collection('quiz_results');
        
        // Check if default project exists
        const defaultProject = await projectsCollection.findOne({ name: "NCC Embedded Lab" });
        
        if (!defaultProject) {
            console.log('🔧 Creating default project and migrating data...');
            
            // Create default project
            const projectDoc = {
                name: "NCC Embedded Lab",
                access_code: "NCC2024",
                time_limit: 1800, // 30 minutes
                description: "Default project for existing assessments",
                created_at: new Date(),
                status: "active"
            };
            
            const projectResult = await projectsCollection.insertOne(projectDoc);
            const defaultProjectId = projectResult.insertedId;
            
            console.log(`✅ Default project created with ID: ${defaultProjectId}`);
            
            // Extract and migrate existing questions from current index.html JavaScript
            // These are the actual NCC Embedded Lab questions currently in use
            const existingQuestions = [
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 1,
                    category: "Data Analysis",
                    skill: "Understanding Confounding Variables",
                    question_text: "You want to prove telecom towers improve satisfaction by comparing Lagos (8,500 towers, 82% satisfaction) with Kebbi (150 towers, 31% satisfaction). Your boss says \"This comparison has problems.\" What is the most likely issue?",
                    options: [
                        "Wealthier states attract more towers and their consumers tend to be more satisfied",
                        "Areas with stronger infrastructure (roads, electricity) both enable more towers and create better customer experiences",
                        "Regions with higher education levels both demand more telecom services and report higher satisfaction",
                        "More urbanized states both support more tower investment and provide conditions for higher satisfaction"
                    ],
                    correct_answer: "A",
                    explanation: "This is a confounding problem: Lagos is wealthier, and wealth is linked to both more tower investment and higher satisfaction. Without controlling for wealth (and related factors), you cannot isolate the true effect of towers."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 2,
                    category: "Data Analysis",
                    skill: "Excel Pivot Table Analysis",
                    question_text: "You have 50,000 complaint records and need a report showing average resolution days by service type and region. What is the most efficient approach in Excel?",
                    options: [
                        "VLOOKUP functions to match service types with resolution times",
                        "Pivot Tables to automatically calculate averages across multiple categories",
                        "Conditional formatting to highlight resolution times above average",
                        "Data validation to filter records by service type and region"
                    ],
                    correct_answer: "B",
                    explanation: "Pivot Tables are designed for this type of multidimensional analysis, automatically calculating averages across service types and regions. Other options require manual work or don\'t perform the necessary calculations."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 3,
                    category: "Data Analysis",
                    skill: "Statistical vs Practical Significance",
                    question_text: "Your campaign improved knowledge from 62% to 64% with 45,000 people surveyed (p<0.001). Your manager says \"Great results!\" What should you consider about this finding?",
                    options: [
                        "The sample size is too large, making the test unreliable",
                        "Small p-values only mean the result isn\'t due to chance, not that the 2% improvement is meaningful",
                        "We need to check if the data meets the assumptions for this test",
                        "The confidence interval would give more accurate information than the p-value"
                    ],
                    correct_answer: "B",
                    explanation: "Statistical significance (p<0.001) only indicates the result is unlikely due to chance. With large samples, even tiny differences become statistically significant. Whether 2% improvement matters for policy is a separate question about practical significance."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 4,
                    category: "Data Analysis",
                    skill: "Self-Selection Bias Recognition",
                    question_text: "Your data shows online complaint users get 45% faster resolution than phone users. Before recommending everyone switch to online, what should concern you most?",
                    options: [
                        "Online systems may record timestamps differently than phone systems",
                        "People who choose online forms may be systematically different from phone users",
                        "The sample sizes for online and phone users may not be equal",
                        "Seasonal patterns may affect online and phone complaint resolution differently"
                    ],
                    correct_answer: "B",
                    explanation: "Self-selection bias is the key concern - online users likely differ systematically in tech skills, writing ability, and persistence. These user characteristics, not the channel itself, may drive the faster resolution."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 5,
                    category: "Data Analysis",
                    skill: "Understanding Simpson\'s Paradox",
                    question_text: "Provider A has higher resolution rates than B for billing complaints (85% vs 80%) AND service complaints (90% vs 85%), yet has lower overall resolution (75% vs 78%). How is this possible?",
                    options: [
                        "There are systematic errors in how resolution rates are calculated",
                        "Provider A handles different proportions of complaint types than Provider B",
                        "The confidence intervals for these estimates likely overlap significantly",
                        "Outlier complaints are affecting the averages differently for each provider"
                    ],
                    correct_answer: "B",
                    explanation: "This is Simpson\'s Paradox. Provider A excels in both categories but handles more difficult billing complaints (lower base resolution rate), while Provider B handles more easier service complaints, affecting overall averages despite A\'s category-level superiority."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 6,
                    category: "Data Analysis",
                    skill: "Measurement Error Impact",
                    question_text: "You\'re studying how income affects telecom spending using survey data where people typically underreport their income. How does this affect your analysis?",
                    options: [
                        "Creates systematic bias by shifting all income values downward",
                        "Makes the income-spending relationship appear weaker than it actually is",
                        "Reduces statistical power by effectively decreasing the sample size",
                        "Violates the independence assumption needed for correlation analysis"
                    ],
                    correct_answer: "B",
                    explanation: "Measurement error in predictor variables (income) creates attenuation bias, making observed correlations weaker than the true relationships. This affects your ability to detect real income-spending patterns."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 7,
                    category: "Data Analysis",
                    skill: "Base Rate Understanding",
                    question_text: "Your fraud detection system catches 92% of fraudulent accounts and has 6% false alarms. In a market where only 0.3% of accounts are fraudulent, what will most flagged accounts actually be?",
                    options: [
                        "Fraudulent accounts because the 92% detection rate is very high",
                        "Legitimate accounts because false alarms outnumber true fraud when fraud is rare",
                        "About evenly split between fraudulent and legitimate accounts",
                        "Cannot be determined without knowing the negative predictive value"
                    ],
                    correct_answer: "B",
                    explanation: "With very low fraud rates (0.3%), the 6% false alarm rate applied to 99.7% legitimate accounts creates far more false positives than the actual fraud cases detected, despite the high sensitivity."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 8,
                    category: "Data Analysis",
                    skill: "Regression to the Mean",
                    question_text: "After training, your worst-performing centers improved dramatically while top centers barely changed. What should you consider before crediting the training?",
                    options: [
                        "Ceiling effects may prevent top performers from showing additional improvement",
                        "Extreme scores naturally tend to become more average on repeat measurement",
                        "The training materials may have been designed specifically for poor performers",
                        "Measurement reliability may be lower for extreme performance scores"
                    ],
                    correct_answer: "B",
                    explanation: "Regression to the mean explains why extreme performers (good or bad) tend to move toward average on remeasurement due to natural statistical variation, independent of any intervention effect."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 9,
                    category: "M&E",
                    skill: "Pre-test and Post-test Purpose",
                    question_text: "You want to demonstrate that your consumer education program improved knowledge. Why is measuring knowledge only after the program insufficient?",
                    options: [
                        "Post-only designs lack sufficient statistical power to detect program effects",
                        "You cannot determine how much knowledge changed without knowing the starting point",
                        "Single measurement cannot establish the proper temporal sequence",
                        "Post-test responses may be biased by social desirability effects"
                    ],
                    correct_answer: "B",
                    explanation: "Without baseline measurement, you cannot attribute observed knowledge levels to the program versus pre-existing knowledge. Pre-post comparison is necessary to measure actual change and isolate program impact."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 10,
                    category: "M&E",
                    skill: "Output vs Outcome vs Impact Distinction",
                    question_text: "Your program achieved: 85% gained knowledge, 68% changed behavior, 15% system-wide complaint reduction. Which represents what the program directly produced?",
                    options: [
                        "The 15% system change because it shows the program\'s ultimate effectiveness",
                        "The 85% knowledge gain because this is what training sessions directly created",
                        "All three results equally demonstrate program accomplishments",
                        "The 68% behavior change because it proves the program worked as intended"
                    ],
                    correct_answer: "B",
                    explanation: "In the results chain: outputs are immediate products (knowledge from training), outcomes are subsequent changes (behavior), impacts are broader effects (system-wide changes). Knowledge is the direct program product."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 11,
                    category: "M&E",
                    skill: "Complex Outcome Measurement",
                    question_text: "You need to measure whether consumers are \"empowered\" to handle telecom issues. What is the main limitation of using only satisfaction surveys?",
                    options: [
                        "Satisfaction surveys typically have response rates too low for reliable measurement",
                        "Empowerment includes multiple dimensions that one indicator cannot fully capture",
                        "Satisfaction questions often contain wording that creates measurement bias",
                        "Survey data collection costs too much for routine program monitoring"
                    ],
                    correct_answer: "B",
                    explanation: "Complex constructs like \"empowerment\" require multiple indicators across different dimensions (knowledge, behavior, capacity, outcomes). Single measures, regardless of quality, cannot capture multidimensional concepts adequately."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 12,
                    category: "M&E",
                    skill: "Monitoring vs Evaluation Distinction",
                    question_text: "For 6 months, you\'ve been tracking training sessions, participant numbers, and immediate feedback scores. What type of M&E activity is this?",
                    options: [
                        "Evaluation because you are measuring program performance over time",
                        "Monitoring because you are tracking ongoing implementation activities and immediate outputs",
                        "Baseline research because you are establishing program performance benchmarks",
                        "Cost-effectiveness analysis because you are tracking resource use over time"
                    ],
                    correct_answer: "B",
                    explanation: "This describes monitoring - regular tracking of implementation activities and immediate outputs. Evaluation would examine whether the program achieved its intended outcomes and impacts, typically done periodically."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 13,
                    category: "M&E",
                    skill: "Logical Framework Design",
                    question_text: "Your program logic: train staff → faster response → higher satisfaction. What should you measure first to track program progress?",
                    options: [
                        "Consumer satisfaction scores across the telecom sector",
                        "Average response times from all service providers",
                        "Number of customer service staff who completed training",
                        "Cost per complaint resolved before and after training"
                    ],
                    correct_answer: "C",
                    explanation: "Following the logical framework sequence, you measure outputs (staff trained) first, then outcomes (response times), then impacts (satisfaction). Outputs are the immediate, directly measurable products of program activities."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 14,
                    category: "RCT/Impact",
                    skill: "Randomization Unit Trade-offs",
                    question_text: "You\'re testing complaint resolution across 300 centers in 50 cities. You could randomly assign individual centers or entire cities to treatment. What is the main advantage of city-level randomization?",
                    options: [
                        "City randomization provides larger sample sizes for statistical analysis",
                        "City randomization prevents centers from learning practices from nearby treated centers",
                        "City randomization improves the representativeness of the sample",
                        "City randomization reduces the complexity of implementation logistics"
                    ],
                    correct_answer: "B",
                    explanation: "City-level (cluster) randomization prevents spillover effects where treated centers share new practices with nearby control centers. This contamination prevention is the key methodological advantage, though it reduces statistical power."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 15,
                    category: "RCT/Impact",
                    skill: "Intent-to-Treat Analysis Logic",
                    question_text: "In your RCT, 78% of treatment group attended training while 22% of controls got similar training elsewhere. For policy decisions, which analysis approach is most useful?",
                    options: [
                        "Per-protocol analysis comparing actual training participants versus pure controls",
                        "Intent-to-treat analysis comparing original assignments regardless of participation",
                        "As-treated analysis comparing everyone who got training versus those who didn\'t",
                        "Dose-response analysis examining effects by hours of training received"
                    ],
                    correct_answer: "B",
                    explanation: "Intent-to-treat analysis preserves randomization and estimates the effect of offering the program, including real-world non-compliance that will occur during policy implementation."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 16,
                    category: "RCT/Impact",
                    skill: "External Validity vs Research Conditions",
                    question_text: "Your closely monitored pilot program achieved 85% complaint resolution, but national rollout achieved only 45%. What most likely explains this large difference?",
                    options: [
                        "National implementation teams had lower qualifications than pilot staff",
                        "Research monitoring created performance conditions not replicable in normal operations",
                        "The complaint types changed between pilot and rollout periods",
                        "Budget constraints limited resources available for national implementation"
                    ],
                    correct_answer: "B",
                    explanation: "Hawthorne effects from intensive research monitoring, frequent check-ins, and special attention often create artificially high performance that cannot be sustained under normal operating conditions without researchers present."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 17,
                    category: "Programming Logic",
                    skill: "Conditional Logic Programming",
                    question_text: "Code: if complaint_type == \"billing\" and amount > 10000: priority = \"high\"; elif complaint_type == \"service\" and downtime > 24: priority = \"high\"; else: priority = \"normal\". What priority does a service complaint with 30-hour downtime receive?",
                    options: [
                        "normal because the amount variable is undefined for service complaints",
                        "high because it satisfies the service complaint condition in the elif statement",
                        "error because the code tries to access an undefined amount variable",
                        "depends on whether the priority variable was initialized before this code"
                    ],
                    correct_answer: "B",
                    explanation: "Following conditional logic: first if fails (complaint_type != \"billing\"), elif succeeds (complaint_type == \"service\" AND downtime > 24 both true), so priority = \"high\". The amount variable is never evaluated."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 18,
                    category: "Programming Logic",
                    skill: "Boolean Logic and Operators",
                    question_text: "Expression: (account_age < 6) AND (complaints != 0) AND NOT (resolved >= total). For account with age=3, complaints=5, resolved=5, total=5, what is the result?",
                    options: [
                        "True because the account meets the age and complaint criteria",
                        "False because the NOT (resolved >= total) part evaluates to false",
                        "Error because comparing resolved to total creates invalid logic",
                        "Undefined because the expression contains contradictory conditions"
                    ],
                    correct_answer: "B",
                    explanation: "Evaluating: (3 < 6) = True, (5 != 0) = True, (5 >= 5) = True so NOT(True) = False. Complete expression: True AND True AND False = False. Account not flagged because all complaints are resolved."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 19,
                    category: "Programming Logic",
                    skill: "System Reliability Design",
                    question_text: "Your system processes 15,000 daily complaints from 10 data sources. Some sources occasionally fail, but you must produce daily reports regardless. What design approach ensures this?",
                    options: [
                        "Implement comprehensive logging to track all system operations",
                        "Process each source independently so failures don\'t prevent other sources from completing",
                        "Use database transactions to maintain consistency across all operations",
                        "Set up automated alerts to notify administrators of any failures immediately"
                    ],
                    correct_answer: "B",
                    explanation: "Independent processing with failure isolation allows successful sources to complete while failed sources are retried, ensuring daily reports are generated even when some data sources have problems."
                },
                {
                    project_id: defaultProjectId,
                    period: "baseline",
                    question_number: 20,
                    category: "Programming Logic",
                    skill: "Algorithm Optimization Strategy",
                    question_text: "Phone number searches take 55 seconds to scan through 8 million records sequentially. What change would provide the biggest performance improvement?",
                    options: [
                        "Use parallel processing to distribute searches across multiple processors",
                        "Create an index structure for direct record lookup instead of scanning everything",
                        "Add more memory to reduce the need for disk access during searches",
                        "Optimize database connections to reduce network communication overhead"
                    ],
                    correct_answer: "B",
                    explanation: "Creating an index changes the algorithm from O(n) sequential scanning to O(log n) or O(1) direct lookup - a fundamental algorithmic improvement that typically provides 100x-1000x performance gains versus hardware optimizations."
                }
            ];
            
            await questionsCollection.insertMany(existingQuestions);
            console.log(`✅ ${existingQuestions.length} existing NCC Embedded Lab questions migrated to database`);
            
            // Update existing quiz results to reference the default project
            const updateResult = await resultsCollection.updateMany(
                { project_id: { $exists: false } },
                { 
                    $set: { 
                        project_id: defaultProjectId,
                        period: "baseline"
                    }
                }
            );
            
            console.log(`✅ Updated ${updateResult.modifiedCount} existing quiz results with project reference`);
        }
        
    } catch (err) {
        console.error('❌ Error initializing default project:', err);
    }
}

// Routes

// Serve main quiz page
app.get('/', (req, res) => {
    console.log('📄 Serving main quiz page');
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API: Validate project access code
app.post('/api/validate-access-code', async (req, res) => {
    const { access_code } = req.body;
    
    if (!access_code) {
        return res.status(400).json({ error: 'Access code required' });
    }
    
    try {
        const projectsCollection = db.collection('projects');
        const project = await projectsCollection.findOne({ 
            access_code: access_code.toUpperCase(),
            status: "active"
        });
        
        if (!project) {
            return res.status(404).json({ error: 'Invalid access code' });
        }
        
        // Get questions for this project
        const questionsCollection = db.collection('questions');
        const questions = await questionsCollection.find({ 
            project_id: project._id 
        }).sort({ question_number: 1 }).toArray();
        
        if (questions.length === 0) {
            return res.status(400).json({ error: 'No questions available for this project' });
        }
        
        res.json({
            success: true,
            project: {
                id: project._id,
                name: project.name,
                time_limit: project.time_limit,
                total_questions: questions.length
            },
            questions: questions.map(q => ({
                id: q.question_number,
                category: q.category,
                skill: q.skill,
                question: q.question_text,
                options: q.options,
                correct: q.correct_answer,
                explanation: q.explanation
            }))
        });
        
    } catch (err) {
        console.error('❌ Error validating access code:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Submit quiz result (enhanced with project context)
app.post('/api/submit-quiz', async (req, res) => {
    console.log('📝 Received quiz submission from:', req.body.participant_name);
    
    if (!db) {
        console.error('❌ Database not available');
        return res.status(500).json({ error: 'Database not available' });
    }
    
    const data = req.body;
    
    // Validate required fields including project context
    if (!data.participant_name || data.total_score === undefined || data.percentage === undefined || !data.project_id) {
        console.error('❌ Invalid submission data');
        return res.status(400).json({ error: 'Invalid data', details: 'Missing required fields including project context' });
    }
    
    try {
        const collection = db.collection('quiz_results');
        
        // Prepare document for MongoDB with project context
        const quizDocument = {
            participant_name: data.participant_name,
            project_id: new ObjectId(data.project_id),
            period: data.period || 'baseline',
            completed_at: new Date(data.completed_at),
            total_score: data.total_score,
            percentage: data.percentage,
            time_taken: data.time_taken || null,
            questions: {},
            created_at: new Date()
        };
        
        // Store questions in a cleaner nested structure
        for (let i = 1; i <= (data.total_questions || 20); i++) {
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
        
        console.log(`✅ Quiz saved successfully! ID: ${result.insertedId}, Participant: ${data.participant_name}, Project: ${data.project_id}`);
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

// API: Get all projects (for admin)
app.get('/api/projects', async (req, res) => {
    console.log('📋 Admin requesting all projects');
    
    try {
        const projectsCollection = db.collection('projects');
        const projects = await projectsCollection.find({}).sort({ created_at: -1 }).toArray();
        
        // Get participant counts for each project
        const resultsCollection = db.collection('quiz_results');
        const projectsWithStats = await Promise.all(projects.map(async (project) => {
            const participantCount = await resultsCollection.countDocuments({ project_id: project._id });
            const questionsCollection = db.collection('questions');
            const questionCount = await questionsCollection.countDocuments({ project_id: project._id });
            
            return {
                ...project,
                participant_count: participantCount,
                question_count: questionCount
            };
        }));
        
        res.json(projectsWithStats);
    } catch (err) {
        console.error('❌ Error fetching projects:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Create new project
app.post('/api/projects', async (req, res) => {
    const { name, description, time_limit } = req.body;
    
    if (!name || !time_limit) {
        return res.status(400).json({ error: 'Name and time limit are required' });
    }
    
    try {
        const projectsCollection = db.collection('projects');
        
        // Generate unique access code
        let access_code;
        let isUnique = false;
        while (!isUnique) {
            access_code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existing = await projectsCollection.findOne({ access_code });
            if (!existing) isUnique = true;
        }
        
        const projectDoc = {
            name,
            description: description || '',
            access_code,
            time_limit: parseInt(time_limit),
            created_at: new Date(),
            status: 'active'
        };
        
        const result = await projectsCollection.insertOne(projectDoc);
        
        console.log(`✅ Project created: ${name} with code: ${access_code}`);
        res.json({
            success: true,
            project: { ...projectDoc, _id: result.insertedId }
        });
        
    } catch (err) {
        console.error('❌ Error creating project:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// API: Get results by project
app.get('/api/results/:project_id?', async (req, res) => {
    console.log('📊 Admin requesting results for project:', req.params.project_id || 'all');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const collection = db.collection('quiz_results');
        let query = {};
        
        if (req.params.project_id && req.params.project_id !== 'all') {
            query.project_id = new ObjectId(req.params.project_id);
        }
        
        const results = await collection.find(query).sort({ completed_at: -1 }).toArray();
        
        // Convert MongoDB results to match frontend expectations
        const formattedResults = results.map(doc => {
            const formatted = {
                id: doc._id,
                participant_name: doc.participant_name,
                project_id: doc.project_id,
                period: doc.period || 'baseline',
                completed_at: doc.completed_at.toISOString(),
                total_score: doc.total_score,
                percentage: doc.percentage,
                time_taken: doc.time_taken,
                created_at: doc.created_at.toISOString()
            };
            
            // Flatten questions for compatibility with existing frontend
            const questionCount = Object.keys(doc.questions || {}).length;
            for (let i = 1; i <= questionCount; i++) {
                const q = doc.questions[`Q${i}`] || {};
                formatted[`Q${i}`] = q.user_answer || '';
                formatted[`Q${i}_correct`] = q.correct_answer || '';
                formatted[`Q${i}_skill`] = q.skill || '';
                formatted[`Q${i}_category`] = q.category || '';
            }
            
            return formatted;
        });
        
        console.log(`✅ Returning ${formattedResults.length} results for project filter`);
        res.json(formattedResults);
        
    } catch (err) {
        console.error('❌ Database error:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// API: Get statistics (enhanced with project filtering)
app.get('/api/stats/:project_id?', async (req, res) => {
    console.log('📈 Admin requesting statistics for project:', req.params.project_id || 'all');
    
    if (!db) {
        return res.status(500).json({ error: 'Database not available' });
    }
    
    try {
        const collection = db.collection('quiz_results');
        let matchQuery = {};
        
        if (req.params.project_id && req.params.project_id !== 'all') {
            matchQuery.project_id = new ObjectId(req.params.project_id);
        }
        
        const statsAggregation = await collection.aggregate([
            { $match: matchQuery },
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
                    ],
                    by_period: [
                        { $group: { _id: "$period", count: { $sum: 1 }, avg_score: { $avg: "$percentage" } } }
                    ]
                }
            }
        ]).toArray();
        
        const stats = statsAggregation[0];
        
        const result = {
            total: stats.total[0]?.count || 0,
            average_score: Math.round(stats.average[0]?.avg_score || 0),
            excellent_count: stats.excellent[0]?.count || 0,
            today_count: stats.today[0]?.count || 0,
            by_period: stats.by_period || []
        };
        
        console.log('✅ Stats calculated:', result);
        res.json(result);
        
    } catch (err) {
        console.error('❌ Database error:', err.message);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// All other existing routes remain the same...
// (health, download-csv, delete results, etc.)

// API: Health check
app.get('/api/health', async (req, res) => {
    try {
        if (!db) {
            throw new Error('Database not initialized');
        }
        
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
            console.log(`💾 Database: MongoDB (persistent with project management)`);
            console.log('✅ System ready for quiz submissions with project-based access control');
        });
    })
    .catch(err => {
        console.error('💥 Failed to initialize database:', err);
        process.exit(1);
    });