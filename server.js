const express = require('express');
const session = require('express-session');
const passport = require('./oauth');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

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


// app.get('/',(req,res)=>{
//     res.send('<a href="/auth/google">OAuth</a>');
// });

app.get('/api/auth/google',passport.authenticate('google',{scope:["profile","email"]}));

app.get('/auth/google/callback',passport.authenticate('google',{failureRedirect: '/'}),(req,res)=>{
    res.redirect(`${process.env.FRONTENDURL}`);
});

app.get('/api/loggedin',(req,res)=>{
    if(req.isAuthenticated()){
        res.json(req.user);
    }else{
        res.status(401).json({messege:'User not authenticated'});
    }
}); 

app.get('/api/logout',(req,res)=>{
    req.logout((err)=>{
        if(err){
            return res.status(500).json({messege:'Logout failed'});
        }
        res.clearCookie('connect.sid');
        res.status(200).send('Logged out');
    });
});

app.listen(port,()=>{
    console.log(`Server is running at port ${port}.`);
});