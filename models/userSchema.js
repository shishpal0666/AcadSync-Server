const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    googleID: {
        type: String,
        require: true,
        unique: true
    },
    name: {
        type: String,
        require: true
    },
    FirstName: {
        type: String,
        require: true
    },
    LastName: {
        type: String,
        require: true
    },
    email: {
        type: String,
        require: true,
        unique: true
    },
    // ProfilePic: {
    //     data: Buffer,
    //     contentType: String
    // },
    ProfilePath: {
        type: String,
        unique: true,
    },
    userCreation: {
        data: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: String,
            default: 'AcadSync'
        }
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;