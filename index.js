require('dotenv').config();
const app = require('express')()
const morgan = require('morgan')
const compression = require('compression')
const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy;
const session = require('express-session')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const User = require('./User')

const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET
const redirect_uri = process.env.REDIRECT_URI

const port = 8888

app.use(morgan('combined'))

let sess = {
    secret: 'txR6$*S@h^sqhmaU6BAqw!tJK2bxS*UR4ju$LfAj4v5UJAuobXZymGH8$*vP&tYDU7x#%eUmCmiZLP@gnmA35A5PWeNF5JhP$3@a9^r3&@!kxaw56rN4TZKW6',
    cookie: {
        maxAge: 60000
    },
    saveUninitialized: true,
    resave: true
}

app.use(session(sess))

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
                		spotifyId : profile.id,
                		accessToken: accessToken,
                		refreshToken: refreshToken
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
        function(req, res) {
            res.send("Hello Cosmos!")
        })

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
            res.redirect('/');
        })
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})