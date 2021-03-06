'use strict'

const bodyParser = require('body-parser');
const yelp = require('yelp-fusion');
const mongoose = require('mongoose');

const urlencodedParser = bodyParser.urlencoded({extended: false});

// Setup YELP API
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
let accessToken;

const token = yelp.accessToken(clientId, clientSecret).then(response => {
    accessToken = response.jsonBody.access_token;
}).catch(e => {
    console.log(e);
});



// Setup Mongoose & MLAB
mongoose.connect(process.env.MLAB_URL);
let userSchema = new mongoose.Schema({
    id: String,
    name: String,
})
let rsvpSchema = new mongoose.Schema({
    id: String,
    rsvps: Object
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
            results: {}
		});
	})



    app.post("/search", urlencodedParser, function(req, res) {

        // Getting User Data
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

            // Render results
            let results = {};
            results.businesses = response.jsonBody.businesses;

            // get rsvp data

            let currentDate = new Date;
            let dateString = currentDate.toDateString();


            RsvpModel.findOne({ id: dateString }, function(err, data) {
                if (err) throw err;

                let rsvps;

                if (data) {
                    rsvps = data.rsvps;
                }

                res.render("index", {
                    user: user,
                    results: results,
                    rsvps: rsvps
                });
            })

            
        }).catch(e => {
            console.log(e);
            res.render("index", {
                user: user,
                results: {},
            });
        });
    })



    app.post("/going", urlencodedParser, function(req, res) {
        
        let currentDate = new Date;
        let dateString = currentDate.toDateString();

        let venueId = req.body.venueId;
        let userId = req.user._json.id_str;

        RsvpModel.findOne({ id: dateString }, function(err, data) {
            if (err) throw err;

            // If there is no data for this day
            if (!data) {
                let rsvpData = {
                    id: dateString,
                    rsvps: {}
                };
                rsvpData.rsvps[venueId] = [userId];

                let newRsvpData = RsvpModel(rsvpData).save(function(err, data) {
                    if (err) throw err;
                })

                res.json({ rsvps: rsvpData.rsvps });

            } else {

                let rsvps = data.rsvps;

                // if the venue already has data for that day
                if (rsvps[venueId]) {

                    // if the user has already send an rsvp
                    if (rsvps[venueId].indexOf(userId) == -1) {

                        let goingArr = rsvps[venueId];
                        goingArr.push(userId);
                        rsvps[venueId] = goingArr;
                    } else {
                        // Remove rsvp
                        let indexToRemove = rsvps[venueId].indexOf(userId);
                        rsvps[venueId].splice(indexToRemove, 1);
                    }
                    
                } else {
                    rsvps[venueId] = [userId];
                }

                RsvpModel.update({ id: dateString }, {
                    $set: { rsvps: rsvps }
                }, function(err, data) {
                    if (err) throw err;
                })

                res.json({ rsvps: rsvps });
            }

        })
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

