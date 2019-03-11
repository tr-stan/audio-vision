const mongoose = require('mongoose')

let userSchema = mongoose.Schema({
	userName: String,
	spotifyId: String,
	accessToken: String,
	refreshToken: String
},
{
	collection: "Users"
})

let userModel = mongoose.model('User', userSchema)

module.exports = userModel