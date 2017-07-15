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
    going: Number
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

    app.post("/going", urlencodedParser, function(req, res) {
        let venueId = req.body.venueId;
        RsvpModel.findOne({ id: venueId }, function(err, data) {
            if (err) throw err;
            if (data) {
                let numberGoing = data.going;
                RsvpModel.update({ id: venueId }, {
                    $set: { going: numberGoing + 1 }
                }, function(err, data) {
                    if (err) throw err;
                })
            } else {
                let newRsvp = {
                    id: venueId,
                    going: 1
                }
                let newRsvpDoc = RsvpModel(newRsvp).save(function(err, data) {
                    if (err) throw err;
                });
            }
        })

        let obj = { myData: "datadatadatad"};
        res.json(obj);
        /*
        let newRsvp = {};
        newRsvp[req.body.businessId] = true;
        console.log("newRsvp: ");
        console.log(newRsvp);
        UserModel.findOne({id: req.user._json.id_str }, function(err, data) {
            if (err) throw err;

            let rsvps = {};
            if (data) {
                rsvps = data.rsvps;
            }
            rsvps[req.body.businessId] = true;
            UserModel.update({ id: req.user._json.id_str }, {
                $set: { rsvps: rsvps }
                }, function(err, data) {
                    if (err) throw err;
                }
            )
        })
        res.end();
        */
    })

	app.get("/signin", function(req, res){
        twitterAuthenticator(req, res);
    })

    var twitterAuthenticator = passport.authenticate("twitter");

    app.get("/signout", function(req, res){
        var username;
        if(req.user) username = req.user.username;
        else username = "user";
        req.session.destroy();
        res.locals.user = null;
        res.render("index", { user: {}, results: {} });
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
            UserModel.findOne({ id: newUser.id }, function(err, data) {
                if (err) throw err;
                if (!data || data == {}) {
                    let newUserDoc = UserModel(newUser).save(function(err, data) {
                        if (err) throw err;
                    })
                } else {
                    
                }
                res.redirect("/");
                
            })
        }
    )
}

