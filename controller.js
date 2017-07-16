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
    lastSearch: String
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

        // Getting User Data
        let user = {};
        if (req.user) {
            user.name = req.user.displayName;
            user.id = req.user._json.id_str;
        } else {
            //console.log(req.headers['x-forwarded-for']);
            //console.log(req.connection.remoteAddress);
            user.id = "IP" + req.connection.remoteAddress;
        }
        user.lastSearch = req.body.query;
        
        // Updating last search data for user
        UserModel.findOne( { id: user.id }, function(err, data) {
            if (err) throw err;
            if (!data) {
                let newUserDoc = UserModel(user).save(function(err, data) {
                    if (err) throw err;
                })
            } else {
                UserModel.update({ id: user.id }, {
                    $set: { lastSearch: req.body.query }
                }, function(err, data) {
                    if (err) throw err;
                })
            }
        })

        // Finding RSVP info for venues
        RsvpModel.find({}, function(err, rsvps) {
            if (err) throw err;

            // Search
            const client = yelp.client(accessToken);

            client.search({
                categories:'nightlife',
                location: req.body.query
            }).then(response => {

                // Render results
                let results = {};
                results.businesses = response.jsonBody.businesses;
                res.render("index", {
                    user: user,
                    results: results,
                    rsvps: rsvps,
                    lastSearch: req.body.query
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
        let userId = req.user._json.id_str;

        RsvpModel.findOne({ id: venueId }, function(err, data) {
            if (err) throw err;
            if (data) {

                let goingArr = data.going;
                goingArr.push(userId);

                RsvpModel.update({ id: venueId }, {
                    $set: { going: goingArr }
                }, function(err, data) {
                    if (err) throw err;
                })
            } else {

                let newRsvp = {
                    id: venueId,
                    going: [userId]
                }

                let newRsvpDoc = RsvpModel(newRsvp).save(function(err, data) {
                    if (err) throw err;
                });
            }
        })
        res.end();
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

