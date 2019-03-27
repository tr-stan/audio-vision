// import .env variables from local environment configurations
require('dotenv').config()

// import package dependencies listed in package.json > "dependencies"
// as well as the "User" model
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

const callback_url = process.env.CALLBACK_URL
const session_secret = process.env.SESSION_SECRET
const mongodb_uri = process.env.MONGODB_URI

const port = process.env.PORT

app.use(morgan('combined'))

let sess = {
    secret: `${session_secret}`,
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

// ensureIsAuthenticated = (request, response, next) => {
//     if (request.isAuthenticated()) {
//         return next();
//     }
//     response.redirect('http://localhost:3000/login')
// }

mongoose.connect(`${mongodb_uri}`, { useNewUrlParser: true })
    .then(() => {
        // console.log success message if the .connect promise returns successful (resolve)
        console.log('Database connection successful')
    })
    // console.logs error message if the .connect promise returns an error (reject)
    .catch(err => {
        console.error(`Database connection error: ${err.message}`)
    })

// instantiate spotify-web-api-node module/package
let spotifyApi = new SpotifyWebApi({
    clientId: `${client_id}`,
    clientSecret: `${client_secret}`,
    redirectUri: `${redirect_uri}`
})

// Open your mongoose connection
let db = mongoose.connection // <this one took me a while to figure out!!
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

    passport.serializeUser(function(user, done) {
    	// console.log("Serialized: " + user)
        console.log("USER ID-------------", + user.spotifyId)
        done(null, user.spotifyId)
    })

    passport.deserializeUser(function(id, done) {
        User.findOne({spotifyId: id}, function(error, user) {
            spotifyApi.resetCredentials()
            done(error, user)
        })
    })

    passport.use(
        new SpotifyStrategy({
                clientID: `${client_id}`,
                clientSecret: `${client_secret}`,
                callbackURL: `${callback_url}`
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


    app.get(
        '/',
        (request, response) => {
            response.send(`Welcome to Audio-Vision! ${JSON.stringify(request.session)}`)
        })

    app.get(
    	'/user',
        (request, response) => {
    		spotifyApi.getMe()
    			.then(data => {
    				console.log('Some info about the authenticated user', data.body)
    				response.send(data.body)
    			})
                .catch(error => {
                    console.log('An error occurred authenticating the user', error.name, error)
                    response.status(401)
                    response.send(error.name)
                })
    	})

    app.post(
        '/search',
        (request, response) => {
            spotifyApi.searchTracks(request.body.track)
                .then(data => {
                    let goodData = data.body.tracks.items.map( item => {
                    console.log(item.name)
                    return {
                        track: item.name,
                        artist: item.artists[0],
                        id: item.id
                    };
                })
                    response.send(goodData)
                })
                .catch(error => {
                    console.log('Search track error', error.name, error)
                })
        })

    app.post(
        '/analyze',
        (request, response) => {
            console.log("MIMIMIMIMIMIMIMIMI\n", request.body.id, "\nMIMIMIMIMIMIMIMIMI")
            spotifyApi.getAudioAnalysisForTrack(request.body.id)
                .then(data => {
                    // let analyzedBars = data.body.bars.map(bar => {
                    //     console.log("BAR",bar)
                    // })
                    let analyzedSegments = data.body.segments.map(segment => {
                        return segment
                    })
                    response.send(analyzedSegments)
                })
                .catch(error => {
                    console.log('Analysis error', error.name, error)
                })
        })

    app.get(
        '/auth/spotify',
        passport.authenticate('spotify', {
        	scope: ['user-read-email', 'user-read-private'],
            showDialog: true
        }),
        function(request, response) {
            // this function should not be called due to the spotify authentication redirect
        })

    app.get(
        '/callback',
        passport.authenticate('spotify', {
            failureRedirect: '/' ,
            message : 'unauthorized'
        }),
        function(request, response) {
            // successful authentication, redirect home
            spotifyApi.setAccessToken(user.accessToken)
            response.body = 'Authorized'
            response.redirect(`${redirect_uri}`);
        })
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})














