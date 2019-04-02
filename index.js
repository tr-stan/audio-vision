// import .env variables from local environment configurations
require('dotenv').config()

// import package dependencies listed in package.json > "dependencies"
// as well as the "User" model
const app = require('express')()
const morgan = require('morgan')
const compression = require('compression')
// const passport = require('passport')
// const SpotifyStrategy = require('passport-spotify').Strategy
const SpotifyWebApi = require('spotify-web-api-node')
const session = require('express-session')
const MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const cors = require('cors')
const User = require('./User')

//===================== ENV/CONFIG VARIABLES ===========================================
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

// set port to 8888 if not specified (heroku can specify in deployment this way)
const port = process.env.PORT
//====================================================================================

app.use(morgan('combined'))
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())



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

// Open your mongoose connection
let db = mongoose.connection

let sess = {
    secret: `${session_secret}`,
    saveUninitialized: false, // don't create session until something stored
    resave: false, //don't save session if unmodified
    store: new MongoStore({
        mongooseConnection: db,
        touchAfter: 2 * 3600
    })
}

app.use(session(sess))
// app.use(passport.initialize());
// app.use(passport.session());

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {

    // generate random string (function taken from spotify's tutorial) to use for state
    // when requesting authorization code to use in token request
    let generateRandomString = function(length) {
        let text = '';
        let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };

    // set scopes for what data the users must approve access to
    let scopes = ['user-read-private', 'user-read-email']
    // instantiate spotify-web-api-node module/package
    let spotifyApi = new SpotifyWebApi({
        clientId: `${client_id}`,
        clientSecret: `${client_secret}`,
        redirectUri: `${redirect_uri}`
    })

    // passport.use(
    //     new SpotifyStrategy({
    //             clientID: `${client_id}`,
    //             clientSecret: `${client_secret}`,
    //             callbackURL: `${callback_url}`
    //         },
    //         function(accessToken, refreshToken, expires_in, profile, done) {
    //             // asynchronous verification, per passport-spotify docs
    //             process.nextTick(function() {
    // User
    // .findOneAndUpdate(
    //     // find user in your mongo db where spotifyID equals id parameter of user profile
    //  { spotifyId : profile.id },
    //     // sets the following properties on the user's document in the mongo db
    //  { $set:{
    //      userName: profile.displayName,
    //      spotifyId : profile.id,
    //      accessToken: accessToken,
    //      refreshToken: refreshToken,
    //      userURI: profile._json.uri
    //    }
    //  },
    //     // creates new document if user document does not already exist in collection
    //     // also returns new document instead of previous document once everything is done
    //  { upsert:true, returnNewDocument : true },
    //  )
    //                 .then( user => {
    //                  console.log(user)
    //                  return done(null, user)
    //                 })
    //                 .catch( error => {
    //                  console.log("Oh no, an error occured with user creation", error.message, error)
    //                     return done(error)
    //                 })
    //             })
    //         }
    //     )
    // )

    app.get(
        '/',
        (request, response) => {
            response.send("Welcome to Audio-Vision!")
        })

    app.get(
        '/auth/spotify',
        // passport.authenticate('spotify', {
        //  scope: ['user-read-email', 'user-read-private'],
        //     showDialog: true
        // }),
        function(request, response) {
            let state = generateRandomString(11)
            let showDialog = true
            let authorizeURL = spotifyApi.createAuthorizeURL(scopes, state, showDialog)
            response.redirect(authorizeURL)
        })

    app.get(
        '/callback',
        // passport.authenticate('spotify', {
        //     failureRedirect: '/' ,
        //     message : 'unauthorized'
        // }),
        function(request, response) {
            let code = request.query.code
            let state = request.query.state
            console.log("SESSION: ", request.session)

            spotifyApi.authorizationCodeGrant(code)
                .then(data => {
                    console.log("DATA BODY: ", data.body)
                    sess.accessToken = data.body['access_token']
                    // set access and refresh token for later use
                    // spotifyApi.setAccessToken(data.body['access_token'])
                    // spotifyApi.setRefreshToken(data.body['refresh_token']);
                    // successful authentication, redirect home
                    // response.body = 'Authorized'

                    response.redirect(`http://localhost:3000/?access_token=${data.body['access_token']}&refresh_token=${data.body['refresh_token']}`);
                })
                .catch(error => {
                    console.log(error.name, error)
                    response.redirect(`http://localhost:3000`)
                })

        })

    app.get(
        '/user/:token',
        (request, response) => {
            let accessToken = request.params.token
            let AuthenticatedSpotifyApi = new SpotifyWebApi({
                clientId: `${client_id}`,
                clientSecret: `${client_secret}`,
                redirectUri: `${redirect_uri}`
            })
            AuthenticatedSpotifyApi.setAccessToken(accessToken)
            AuthenticatedSpotifyApi.getMe()
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
        '/search/',
        (request, response) => {
            console.log("USSSSSSSSSSSEEERRRRR", request.user)
            spotifyApi.searchTracks(request.body.track)
                .then(data => {
                    let goodData = data.body.tracks.items.map(item => {
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

    // passport.serializeUser(function(user, done) {

    //     console.log("USER ID-------------", user.id)
    //     done(null, user.id)
    // })

    // passport.deserializeUser(function(id, done) {
    //     console.log("DESERIALIZE ID", id)
    //     User.findById(id, function(error, user) {
    //         done(error, user.id)
    //     })
    // })
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})