const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const Strategy = require("passport-twitter").Strategy;
const controller = require('./controller');
const env = require('./env');

app.set("view engine", "pug");

app.use(express.static('./public'));

var cookieParserFunction = cookieParser();
app.use(function(req, res, next){
    cookieParserFunction(req, res, next);
});

var sessionFunction = session({
    secret: env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
});

app.use(function(req, res, next){
    sessionFunction(req, res, next);
});

var passportInitializer = passport.initialize();
app.use(function(req, res, next){
    passportInitializer(req, res, next);
});

var passportSessionFunction = passport.session();
app.use(function(req, res, next){
    passportSessionFunction(req, res, next);
});

app.use(function(req, res, next){
    res.locals.user = req.user;
    next();
});

passport.serializeUser(function(user, next) {
    next(null, user);
});

passport.deserializeUser(function(user, next) {
    next(null, user);
});

let twitterObj = {
    consumerKey: env.twitter.CONSUMER_KEY,
    consumerSecret: env.twitter.CONSUMER_SECRET,
    callbackURL: env.twitter.CALLBACK_URL
}

var twitterStrategy = new Strategy(
    twitterObj,
    function(token, tokenSecret, profile, next){
        next(null, profile);
    }
);
passport.use(twitterStrategy);

// Set up Routes
controller(app, passport);

const port = process.env.PORT || 3000;

app.listen(port, function(){
    console.log("Server running");
});
