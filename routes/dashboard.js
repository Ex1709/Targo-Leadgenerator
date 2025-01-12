const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Replace with your actual User model

// Protected Dashboard Route
router.get('/', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/'); // Redirect to login if not authenticated
    }

    try {
        // Fetch user details from the database
        const user = await User.findById(req.session.user.id);

        if (!user) {
            req.session.destroy(); // Destroy invalid session
            return res.redirect('/'); // Redirect to login
        }

        res.render('dashboard', {
            username: user.username,
            email: user.email,
            cvrNumber: user.cvrNumber,
            subscription: user.accessTime, // Access From and Access To
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while loading the dashboard.');
    }
});




module.exports = router;
