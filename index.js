// import .env variables from local environment configurations
require('dotenv').config()

// import package dependencies listed in package.json > "dependencies"
// as well as the "User" model
const app = require('express')()
const morgan = require('morgan')
const compression = require('compression')
const bodyParser = require('body-parser')
const cors = require('cors')

const SpotifyWebApi = require('spotify-web-api-node')

const User = require('./User')

//===================== ENV/CONFIG VARIABLES ===========================================
// you can get client_id and client_secret from registering your app with Spotify
// at developer.spotify.com/dashboard
// then you will need to save them in a local .env file that is added to your .gitignore
const client_id = process.env.CLIENT_ID
const client_secret = process.env.CLIENT_SECRET

// the url for this redirect_uri must be added (or 'whitelisted') in settings of your app
// and needs to match exactly any uri you will be redirecting to through your auth process
// most of the troubleshooting I did seems to state the most common issue is that
// users include or don't include a slash at the end of their URIs. These must match exactly.
const redirect_uri = process.env.REDIRECT_URI
const callback_url = process.env.CALLBACK_URL

// set port to 8888 if not specified (heroku can specify in deployment this way)
const port = process.env.PORT
//====================================================================================

app.use(morgan('combined'))
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


// generate random string (function taken from spotify's tutorial) to use for state
// when requesting authorization code to use in token request
let generateRandomString = function (length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// set scopes for what data the users must approve access to
let scopes = ['user-read-private', 'user-read-email']

// instantiate spotify-web-api-node module/package
let spotifyApi = new SpotifyWebApi({
    clientId: client_id,
    clientSecret: client_secret,
    redirectUri: callback_url
})

app.get(
    '/',
    (request, response) => {
        response.send("Welcome to Audio-Vision!")
    })

app.get(
    '/auth/spotify',
    function (request, response) {
        let state = generateRandomString(11)
        let showDialog = true

        // create the authorizeURL with parameters for what scopes user will approve access to
        // this app will redirect to Spotify, and once user approves then it will send
        // an authorization code to our designated redirect_uri
        let authorizeURL = spotifyApi.createAuthorizeURL(scopes, state, showDialog)
        console.log(callback_url)
        console.log(authorizeURL, "<--AUTHORIZEURL")
        response.redirect(authorizeURL)
    })

app.get(
    '/callback',
    function (request, response) {
        // set variable for auth code and state sent from Spotify's redirect
        let code = request.query.code
        console.log(`code is ${code}`);
        let state = request.query.state

        // send auth code back to spotify in order to receive access token and refresh token
        spotifyApi.authorizationCodeGrant(code)
            .then(data => {
                console.log("DATA BODY: ", data.body)
                // request.accessToken = data.body['access_token']
                spotifyApi.setAccessToken(data.body['access_token'])

                // successful authentication, redirect home
                // putting access token in redirect url as search parameter to be used on front-end
                // and passed to back-end for subsequent calls
                response.redirect(`${redirect_uri}/?access_token=${data.body['access_token']}`)
            })
            .catch(error => {
                console.log(error.name, error)
                response.redirect(`${redirect_uri}`)
            })

    })

app.get(
    '/user/:token',
    (request, response) => {

        let accessToken = request.params.token

        // here I am creating a new instance of SpotifyWebApi because in order
        // to have multiple users be able to log in at the same time, the access token
        // must be set locally for each request to Spotify's web API
        let AuthenticatedSpotifyApi = new SpotifyWebApi({
            clientId: `${client_id}`,
            clientSecret: `${client_secret}`,
            redirectUri: `${callback_url}`
        })

        // let storedCollection = db.collection('sessions')
        // console.log("ID OF SESSION", request.sessionID)

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
    '/search/:token',
    (request, response) => {
        let accessToken = request.params.token

        let AuthenticatedSpotifyApi = new SpotifyWebApi({
            clientId: `${client_id}`,
            clientSecret: `${client_secret}`,
            redirectUri: `${callback_url}`
        })

        AuthenticatedSpotifyApi.setAccessToken(accessToken)
        AuthenticatedSpotifyApi.searchTracks(request.body.track)
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
    '/analyze/:token',
    (request, response) => {
        let accessToken = request.params.token

        let AuthenticatedSpotifyApi = new SpotifyWebApi({
            clientId: `${client_id}`,
            clientSecret: `${client_secret}`,
            redirectUri: `${callback_url}`
        })

        AuthenticatedSpotifyApi.setAccessToken(accessToken)
        AuthenticatedSpotifyApi.getAudioAnalysisForTrack(request.body.id)
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

app.listen(port || 3000, () => {
    console.log(`Listening on port ${port}`)
})
