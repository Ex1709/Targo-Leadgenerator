const express = require('express');
const router = express.Router();
const User = require('../models/User');

const ADMIN_PASSWORD = 'Supersecretphraseherdetvedvigodt';

router.get('/', async (req, res) => {
    const { password } = req.query;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).send('Unauthorized Access');
    }

    try {
        const users = await User.find(); // Fetch all users
        res.render('tadmin', { users }); // Render the tadmin.ejs file
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred while loading the admin panel.');
    }
});

router.post('/ban', async (req, res) => {
    const { userId } = req.body;

    try {
        await User.findByIdAndUpdate(userId, { accessTime: { from: null, to: null } });
        res.redirect(`/tadmin?password=${ADMIN_PASSWORD}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error banning the user.');
    }
});

router.post('/revoke', async (req, res) => {
    const { userId } = req.body;

    try {
        // Fetch the user from the database
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('User not found');
        }

        // If accessTime was null, set reasonable defaults (e.g., 1 year from today)
        const now = new Date();
        const defaultFrom = now;
        const defaultTo = new Date(now.setFullYear(now.getFullYear() + 1));

        // Restore original dates or set defaults
        const restoredAccess = {
            from: user.accessTime?.from || defaultFrom,
            to: user.accessTime?.to || defaultTo,
        };

        await User.findByIdAndUpdate(userId, { accessTime: restoredAccess });
        res.redirect(`/tadmin?password=${ADMIN_PASSWORD}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error revoking the ban on the user.');
    }
});


// Render Edit Subscription Form
router.get('/edit-subscription/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('edit-subscription', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error loading subscription edit form.');
    }
});

// Handle Subscription Update
// Handle Subscription Update
router.post('/edit-subscription', async (req, res) => {
    const { userId, accessFrom, accessTo } = req.body;

    try {
        // Update accessTime in the database
        await User.findByIdAndUpdate(userId, {
            accessTime: {
                from: new Date(accessFrom),
                to: new Date(accessTo),
            },
        });

        res.redirect(`/tadmin?password=${ADMIN_PASSWORD}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating subscription.');
    }
});


router.post('/delete', async (req, res) => {
    const { userId } = req.body;

    try {
        await User.findByIdAndDelete(userId);
        res.redirect(`/tadmin?password=${ADMIN_PASSWORD}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error deleting the user.');
    }
});






router.post('/', async (req, res) => {
    const { cvrNumber, email, username, phoneNumber, password, accessFrom, accessTo } = req.body;

    try {
        const newUser = new User({
            cvrNumber,
            email,
            username,
            phoneNumber,
            password,
            accessTime: {
                from: new Date(accessFrom),
                to: new Date(accessTo),
            },
        });

        await newUser.save();
        res.redirect(`/tadmin?password=${ADMIN_PASSWORD}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error creating a new user.');
    }
});

module.exports = router;
