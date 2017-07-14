'use strict'

const bodyParser = require('body-parser');
const yelp = require('yelp-fusion');
const mongoose = require('mongoose');
const env = require('./env');

const urlencodedParser = bodyParser.urlencoded({extended: false});

// Setup YELP API
const clientId = env.yelp.CLIENT_ID;
const clientSecret = env.yelp.CLIENT_SECRET;
let accessToken;

const token = yelp.accessToken(clientId, clientSecret).then(response => {
    accessToken = response.jsonBody.access_token;
}).catch(e => {
    console.log(e);
});

// Setup Mongoose & MLAB
mongoose.connect(env.MLAB_URL);
let userSchema = new mongoose.Schema({
    id: String,
    name: String,
    rsvps: Object
})
let rsvpSchema = new mongoose.Schema({
    id: String,
    going: Array
})
let UserModel = mongoose.model('users', userSchema);
let RsvpModel = mongoose.model('rsvps', rsvpSchema);

module.exports = function(app, passport) {
	app.get("/", function(req, res) {
        let user = {};
        let results = {};
        if (req.user) {
        user.name = req.user.displayName;
            user.id = req.user._json.id_str;
        }
		res.render("index", {
			user: user,
            results: results
		});
	})

    app.post("/search", urlencodedParser, function(req, res) {
        RsvpModel.find({}, function(err, rsvps) {
            if (err) throw err;
            let user = {};
            if (req.user) {
                user.name = req.user.displayName;
                user.id = req.user._json.id_str;
            }
            // Search
            const client = yelp.client(accessToken);

            client.search({
                categories:'nightlife',
                location: req.body.query
            }).then(response => {

                let results = {};
                results.businesses = response.jsonBody.businesses;
                res.render("index", {
                    user: user,
                    results: results,
                    rsvps: rsvps
                });
            }).catch(e => {
                console.log(e);
                res.render("index", {
                    user: user,
                    results: {},
                });
            });
        })
    })

	app.get("/signin", function(req, res){
        twitterAuthenticator(req, res);
    })

    var twitterAuthenticator = passport.authenticate("twitter");

    app.get("/signout", function(req, res){
        PollModel.find({}, function(err, polls) {
            if (err) throw err;
            var username;
            if(req.user) username = req.user.username;
            else username = "user";
            req.session.destroy();
            res.locals.user = null;
            res.render("signout", { user: {}, polls: polls });
        })
    });

    var authenticateNewUser = passport.authenticate("twitter", { failureRedirect: "/signout" });

    app.get("/auth/twitter/callback", function(req, res, next) {
            authenticateNewUser(req, res, next);
        }, function(req, res) {
            let newUser = {
                id: req.user._json.id_str,
                name: req.user.displayName,
                rsvps: {}
            }
            UserModel.find({ id: newUser.id }, function(err, data) {
                if (err) throw err;
                console.log("data: " + data);
                console.log("typeof data: " + (typeof data));
                if (!data) {
                    let newUserDoc = UserModel(newUser).save(function(err, data) {
                        if (err) throw err;
                    })
                } else {
                    console.log("user ID: " + newUser.id);
                    let newRsvp = {"one": 345};
                    UserModel.update({ id: newUser.id }, {
                        $set: { rsvps: newRsvp }
                        }, function(err, data) {
                            if (err) throw err;
                        }
                    )
                }
                
            })
        }
    )
}

