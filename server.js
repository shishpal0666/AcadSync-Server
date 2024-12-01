const express = require('express');
const session = require('express-session');
require('dotenv').config();
const passport = require('./oauth');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/userSchema');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.json());



app.use(cors({
    origin: process.env.FRONTENDURL,
    credentials: true,
}));

app.use(
    session({
        secret: "secret",
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true,
            secure: false,
            // maxAge: 1000 * 60 * 60 * 24 * 30,
        },
    })
);

app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});


app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODBURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('Connected to MongoDB.');
        app.listen(port, () => {
            console.log(`Server is running at port ${port}.`);
        });
    }).catch(() => {
        console.log("MongoDB connection Failed.");
    });

app.get('/api/auth/google', passport.authenticate('google', { scope: ["profile", "email"] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/' }), async (req, res) => {
    const userJson = req.user._json;
    const userDetails = {
        googleID: userJson.sub,
        name: userJson.name,
        FirstName: userJson.given_name,
        LastName: userJson.family_name,
        email: userJson.email,
    }
    try {
        let user = await User.findOne({ googleID: userDetails.googleID });
        if (!user) {

            const profileImage = await axios.get(userJson.picture, {
                responseType: 'arraybuffer'
            });

            const ProfilePic = {
                data: Buffer.from(profileImage.data),
                contentType: profileImage.headers['content-type'],
            }

            const profileFilename = `${userDetails.googleID}.png`;
            const profilePicPath = path.join(__dirname, 'uploads', 'profile-pics', profileFilename);
            fs.writeFileSync(profilePicPath, Buffer.from(profileImage.data));

            user = new User({
                ...userDetails,
                ProfilePath: `uploads/profile-pics/${profileFilename}`,
                ProfilePic,
            });

            await user.save();
            console.log("New user added.");
        } else {
            console.log("User already exixts.");
        }
        res.redirect(`${process.env.FRONTENDURL}`);
    } catch (err) {
        console.log("Error saving user: ", err);
        res.status(500).json({ messege: 'Error verifying or creating user' });
    }
});

app.get('/api/loggedin', async (req, res) => {
    if (req.isAuthenticated()) {

        try {
            const user = await User.findOne({ googleID: req.user.id });

            if (!user) {
                res.status(404).json({ messege: "user not found." });
            }

            const profilePicUrl = `${process.env.BackendUrl}/${user.ProfilePath}`;

            const userAPI = {
                googleID: user.googleID,
                name: user.name,
                FirstName: user.given_name,
                LastName: user.family_name,
                email: user.email,
                ProfilePic: profilePicUrl,
            }
            res.json(userAPI);
        } catch (err) {
            console.log("Erroe fetching user: ", err);
            res.send(500).json({ messege: "Error fetching user." });
        }

    } else {
        res.status(401).json({ messege: 'User not authenticated' });
    }
});


app.get('/api/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ messege: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.status(200).send('Logged out');
    });
});



app.get('/profile-pics/:userId', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            res.status(401).json({ messege: "Unauthorized access." });
        } else {

            const id = req.params.userId;
            const user = await User.findOne({ googleID: id });
            if (!user || !user.ProfilePath) {
                res.status(404).json({ messege: "Profile picture not found." });
            } else {

                const profile = path.join(__dirname, 'uploads','profile-pics',`${user.googleID}.png`);
                if (fs.existsSync(profile)) {
                    if(user.googleID != id){
                        res.status(401).json({message:"Unauthorized access."});
                    }
                    res.sendFile(profile);
                } else {
                    res.status(404).json({ messege: "Profile picture not found." });
                }
            }

        }
    } catch (err) {
        console.log('Error fetching Profile picture: ', err);
        res.status(500).json({ messege: "Cannot get profile." });
    }
});