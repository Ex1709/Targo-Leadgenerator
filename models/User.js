const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    cvrNumber: String,
    email: String,
    username: String,
    password: String,
    accessTime: {
        from: Date,
        to: Date,
    },
    phoneList: [String], // Array of phone numbers
    mailList: [String],  // Array of emails
});

module.exports = mongoose.model('User', UserSchema);
