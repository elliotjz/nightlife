'use strict'

const bodyParser = require('body-parser');
const yelp = require('yelp-fusion');
const env = require('./env');

const urlencodedParser = bodyParser.urlencoded({extended: false});

const clientId = env.yelp.CLIENT_ID;
const clientSecret = env.yelp.CLIENT_SECRET;
let accessToken;

const token = yelp.accessToken(clientId, clientSecret).then(response => {
    accessToken = response.jsonBody.access_token;
}).catch(e => {
    console.log(e);
});

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

        let user = {};
        if (req.user) {
            user.name = req.user.displayName;
            user.id = req.user._json.id_str;
        }

        const client = yelp.client(accessToken);

        client.search({
            categories:'nightlife',
            location: req.body.query
        }).then(response => {

            let results = {};
            results.businesses = response.jsonBody.businesses;
            res.render("index", {
                user: user,
                results: results
            });
        }).catch(e => {
            console.log(e);
            res.render("index", {
                user: user,
                results: {}
            });
        });
    })

	app.get("/signin", function(req, res){
        twitterAuthenticator(req, res);
    });

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

    app.get("/auth/twitter/callback", function(req, res, next){
            authenticateNewUser(req, res, next);
        }, function(req, res){
            newUser = {
                id: req.user._json.id_str,
                name: req.user.displayName,
            }
            res.redirect('/');
        });
}