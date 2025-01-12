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

        res.render('leed-generator', {
            username: user.username,
            email: user.email,
            cvrNumber: user.cvrNumber,
            subscription: user.accessTime, // Access From and Access To
        });
    } catch (err) {
        console.error('Error loading Leed Generator:', err);
        res.status(500).send('An error occurred while loading the Leed Generator.');
    }
});

// Other API Routes


router.get('/api/companies', async (req, res) => {
    const { branchekode, page = 1, districts, founded_from, founded_to, zip_from, zip_to } = req.query;

    if (!branchekode) {
        return res.status(400).json({ error: 'Branchekode is required' });
    }

    // Construct the base URL with required parameters
    let url = `Find your own API`

    // Add districts if provided
    if (districts) {
        const districtParams = districts
            .split(',')
            .map((district) => `districts%5B%5D=${district}`)
            .join('&');
        url += `&${districtParams}`;
    }

    // Add date range filters if provided
    if (founded_from) {
        url += `&founded_from=${founded_from}`;
    }
    if (founded_to) {
        url += `&founded_to=${founded_to}`;
    }

    // Add postal code filters if provided
    if (zip_from) {
        url += `&zip_from=${zip_from}`;
    }
    if (zip_to) {
        url += `&zip_to=${zip_to}`;
    }

    console.log('Constructed URL:', url); // Debugging: Inspect the constructed URL

    const config = {
        method: 'get',
        url,
        headers: {
            'accept': '*/*',
            'accept-language': 'da-DK,da;q=0.9',
            'priority': 'u=1, i',
            'sec-ch-ua': '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'sec-gpc': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest',
        },
    };

    try {
        const response = await axios.request(config);
        // Return the raw HTML response
        res.json({ data: response.data });
    } catch (error) {
        console.error('Error fetching companies:', error.message);
        res.status(500).json({ error: 'Failed to fetch companies.' });
    }
});


router.get('/api/company-details/:cvr', async (req, res) => {
    const cvr = req.params.cvr;

    if (!cvr) {
        return res.status(400).json({ error: 'CVR is required.' });
    }

    const primaryApiUrl = `https://apicvr.dk/api/v1/${cvr}`;
    const fallbackApiUrl = `https://cvrapi.dk/api?country=dk&version=6&vat=${cvr}`;

    try {
        // Fetch data from the primary API
        const primaryResponse = await axios.get(primaryApiUrl);
        const primaryData = primaryResponse.data;

        // Fetch data from the fallback API
        const fallbackResponse = await axios.get(fallbackApiUrl);
        const fallbackData = fallbackResponse.data;

        // Consolidate data
        const companyDetails = {
            vat: primaryData.vat || fallbackData.vat || null,
            name: primaryData.name || fallbackData.name || "Unknown Company",
            address: primaryData.address || fallbackData.address || "Unknown Address",
            zipcode: primaryData.zipcode || fallbackData.zipcode || null,
            city: primaryData.city || fallbackData.city || "Unknown City",
            protected: primaryData.protected || fallbackData.protected || false,
            phone: primaryData.phone || fallbackData.phone || "Not Available",
            email: primaryData.email || fallbackData.email || "Not Available",
            website: primaryData.website || fallbackData.website || "Not Available",
            industrydesc: primaryData.industrydesc || fallbackData.industrydesc || "Not Available",
            companydesc: primaryData.companydesc || fallbackData.companydesc || "Not Available",
            status: primaryData.status || fallbackData.status || "Unknown Status",
            startdate: primaryData.startdate || fallbackData.startdate || "Unknown Start Date",
            enddate: primaryData.enddate || fallbackData.enddate || null,
            bankrupt: primaryData.bankrupt || fallbackData.creditbankrupt || false,
            owners: fallbackData.owners ? fallbackData.owners.map(owner => owner.name) : "Not Available",
        };

        // Return consolidated company details
        res.status(200).json({ success: true, companyDetails });
    } catch (error) {
        console.error("Error fetching company details:", error.message);
        res.status(500).json({ success: false, error: "Failed to fetch company details." });
    }
});


router.delete('/api/users/emails', ensureAuthenticated, async (req, res) => {
    const { email } = req.body;

    if (!email?.trim()) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        const user = await User.findById(req.session.user.id);

        const formattedEmailIndex = user.mailList.findIndex(
            (entry) => entry.split(' | ')[1] === email.trim()
        );

        if (formattedEmailIndex === -1) {
            return res.status(404).json({ error: 'Email not found.' });
        }

        user.mailList.splice(formattedEmailIndex, 1); // Remove the email
        await user.save();

        res.status(200).json({ message: 'Email deleted successfully' });
    } catch (error) {
        console.error('Error deleting email:', error.message);
        res.status(500).json({ error: 'Failed to delete email.' });
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
