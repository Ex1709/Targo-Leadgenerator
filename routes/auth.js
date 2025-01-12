const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Replace with your actual User model

// Render Login Page
router.get('/', (req, res) => {
    res.render('login'); // Render the login page
});


// Handle Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error logging out');
        }
        res.redirect('/'); // Redirect to login page after logout
    });
});


// Handle Login Submission
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });

        if (user) {
            req.session.user = { username: user.username, id: user._id };
            return res.redirect('/dashboard');
        }

        res.render('login', { error: 'Invalid credentials' });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Internal Server Error');
    }
});




module.exports = router;
