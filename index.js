require('dotenv').config()
const app = require('express')()
const morgan = require('morgan')
const compression = require('compression')
const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy
const SpotifyWebApi = require('spotify-web-api-node')
const session = require('express-session')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const User = require('./User')

// you can get client_id and client_secret from registering your app with Spotify
// at developer.spotofy.com/dashboard
// then you will need to save them in a local .env file that is added to your .gitignore
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
// the url for this redirect_uri must be added (or 'whitelisted') in settings of your app
// and needs to match exactly any uri you will be redirecting to through your auth process
// most of the troubleshooting I did seems to state the most common issue is that
// users include or don't include a slash at the end of their URIs. These must match exactly.
const redirect_uri = process.env.REDIRECT_URI

let spotifyApi = new SpotifyWebApi({
	clientId: client_id,
	clientSecret: client_secret,
	redirectUri: redirect_uri
})

const port = 8888

app.use(morgan('combined'))

let sess = {
    secret: 'txR6$*S@h^sqhmaU6BAqw!t',
    cookie: {
        maxAge: 60000
    },
    saveUninitialized: true,
    resave: true
}

app.use(session(sess))
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(`mongodb://localhost:27017/spotifeyes`, { useNewUrlParser: true })
    .then(() => {
        // console.log success message if the .connect promise returns successful (resolve)
        console.log('Database connection successful')
    })
    // console.logs error message if the .connect promise returns an error (reject)
    .catch(err => {
        console.error(`Database connection error: ${err.message}`)
    })

// Open your mongoose connection
let db = mongoose.connection // <this one took me a while to figure out!!
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    passport.use(
        new SpotifyStrategy({
                clientID: client_id,
                clientSecret: client_secret,
                callbackURL: 'http://localhost:8888/callback'
            },
            function(accessToken, refreshToken, expires_in, profile, done) {
                User
                .findOneAndUpdate(
                	{ spotifyId : profile.id },
                	{ $set:{
                		userName: profile.displayName,
                		spotifyId : profile.id,
                		accessToken: accessToken,
                		refreshToken: refreshToken,
                		userURI: profile._json.uri
                	  }
                	},
                	{ upsert:true, returnNewDocument : true },
                	)
                .then( user => {
                	console.log(user)
                	return done(null, user)
                })
                .catch( error => {
                	console.log("Oh no, an error occured with user creation", error.message, error)
                })
            }
        )
    )

    passport.serializeUser(function(user, done) {
    	spotifyApi.setAccessToken(user.accessToken)
    	console.log("Serialized: " + user)
    	userCookie = {
    		userId : user.spotifyId,
    		userAccsessToken : user.accessToken
    	}
        done(null, user.id)
    })

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(error, user) {
            if (error) { return done(err) }
            done(null, user)
        })
    })

    app.get(
        '/',
        function(request, response) {
            response.send(`Hello Cosmos!`)
        })
    app.get(
    	'/user', (request, response) => {
    		spotifyApi.getMe()
    			.then(data => {
    				console.log('Some info about the authenticated user', data.body)
    				response.send(data.body)
    			})
    	}
    	)

    app.get(
        '/auth/spotify',
        passport.authenticate('spotify', {
        	scope: ['user-read-email', 'user-read-private'],
        	showDialog: true
        }),
        function(req, res) {
            // this function should not be called due to the spotify authentication redirect
        })

    app.get(
        '/callback',
        passport.authenticate('spotify', { failureRedirect: '/' }),
        function(req, res) {
            // successful authentication, redirect home
            console.log(userCookie)
            res.redirect('http://localhost:3000/profile');
        })
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})














