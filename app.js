const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
// Route Imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');
const leedGeneratorRoutes = require('./routes/leedGenerator');
const MailListRoute = require('./routes/maillist');
const phoneroute = require('./routes/phonelist');
const { Configuration, OpenAIApi } = require('openai');
const axios = require('axios');
const fs = require('fs');
const xml2js = require('xml2js');
const { applyTimestamps } = require('./models/User');


const app = express();

app.use(session({
    secret: 'targo_b2b_secret_key', // Replace with a secure secret key
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// MongoDB connection
mongoose.connect('Targo MongoDB String', { 
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB')).catch(err => console.error(err)
);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Routes
app.use('/', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/tadmin', adminRoutes);
app.use('/leed-generator', leedGeneratorRoutes);
app.use('/mail-list', MailListRoute);
app.use('/phone-list', phoneroute);






app.get('/api/branchekoder', (req, res) => {
    const branchekoderPath = path.join(__dirname, '/public/branche.xml');

    fs.readFile(branchekoderPath, (err, data) => {
        if (err) {
            console.error('Error reading Branchekoder XML:', err.message);
            return res.status(500).json({ error: 'Failed to load Branchekoder.' });
        }

        const parser = new xml2js.Parser();
        parser.parseString(data, (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err.message);
                return res.status(500).json({ error: 'Failed to parse Branchekoder XML.' });
            }

            const branchekoder = result.ArrayOfCvrBranchekode.CvrBranchekode.map((item) => ({
                code: item.BrancheKode[0],
                name: item.Navn[0],
                description: item.tekst[0],
            }));
            res.json(branchekoder);
        });
    });
});


app.post('/api/analyze', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required.' });
    }

    try {
        const completion = await openai.createChatCompletion({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: 'You are an AI financial analyst.' },
                { role: 'user', content: prompt },
            ],
        });

        const message = completion.data.choices[0].message.content;
        res.status(200).json({ message });
    } catch (error) {
        console.error('Error with OpenAI API:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate analysis' });
    }
});


// Start the server
const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

