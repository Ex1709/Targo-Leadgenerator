const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const User = require('../models/User');
const router = express.Router();

// Authentication Middleware
function ensureAuthenticated(req, res, next) {
    console.log('Session Data:', req.session); // Debugging: Log session data
    if (req.session && req.session.user) {
        return next(); // User is authenticated
    }
    console.error('Authentication failed: Session or user missing');
    res.redirect('/'); // Redirect to login if not authenticated
}

// Protected Route for Leed Generator
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        // Fetch user details from the database
        const user = await User.findById(req.session.user.id);

        if (!user) {
            req.session.destroy(); // Destroy invalid session
            return res.redirect('/'); // Redirect to login
        }

        res.render('mail-list', {
            username: user.username,
            email: user.email,
            cvrNumber: user.cvrNumber,
            subscription: user.accessTime, // Access From and Access To
        });
    } catch (err) {
        console.error('Error loading Mail list:', err);
        res.status(500).send('An error occurred while loading the Leed Generator.');
    }
});





// Add Phone Number
// Add Phone Number
router.post('/api/users/phones', ensureAuthenticated, async (req, res) => {
    const { phone, companyName } = req.body;

    if (!phone?.trim() || !companyName?.trim()) {
        return res.status(400).json({ error: 'Both phone number and company name are required.' });
    }

    try {
        const user = await User.findById(req.session.user.id);

        if (user.phoneList.includes(`${companyName.trim()} | ${phone.trim()}`)) {
            return res.status(400).json({ error: 'Phone number already exists.' });
        }

        const formattedPhone = `${companyName.trim()} | ${phone.trim()}`;
        user.phoneList.push(formattedPhone);
        await user.save();

        res.status(200).json({ message: 'Phone number added successfully' });
    } catch (error) {
        console.error('Error adding phone number:', error.message);
        res.status(500).json({ error: 'Failed to add phone number.' });
    }
});



// Add Email
router.post('/api/users/emails', ensureAuthenticated, async (req, res) => {
    const { email, companyName } = req.body;

    if (!email?.trim() || !companyName?.trim()) {
        return res.status(400).json({ error: 'Both email and company name are required.' });
    }

    try {
        const user = await User.findById(req.session.user.id);

        if (user.mailList.includes(`${companyName.trim()} | ${email.trim()}`)) {
            return res.status(400).json({ error: 'Email already exists.' });
        }

        const formattedEmail = `${companyName.trim()} | ${email.trim()}`;
        user.mailList.push(formattedEmail);
        await user.save();

        res.status(200).json({ message: 'Email added successfully' });
    } catch (error) {
        console.error('Error adding email:', error.message);
        res.status(500).json({ error: 'Failed to add email.' });
    }
});


// Delete Email



// Fetch User's Phone List
router.get('/api/users/phones', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id, { phoneList: 1 });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user.phoneList || []);
    } catch (error) {
        console.error('Error fetching phone list:', error.message);
        res.status(500).json({ error: 'Failed to fetch phone list.' });
    }
});

// Fetch User's Email List
router.get('/api/users/emails', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id, { mailList: 1 });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user.mailList || []);
    } catch (error) {
        console.error('Error fetching email list:', error.message);
        res.status(500).json({ error: 'Failed to fetch email list.' });
    }
});

// Consolidated Phone and Email Lists
router.get('/api/users/lists/consolidated', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user.id, { phoneList: 1, mailList: 1 });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ phones: user.phoneList || [], emails: user.mailList || [] });
    } catch (error) {
        console.error('Error fetching consolidated lists:', error.message);
        res.status(500).json({ error: 'Failed to fetch consolidated lists.' });
    }
});


module.exports = router;
