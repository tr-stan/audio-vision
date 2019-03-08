require('dotenv').config();
const app = require('express')()
const morgan = require('morgan')
const compression = require('compression')
const passport = require('passport')
const session = require('express-session')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

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

app.get('/', (request, response) => {
	console.log("hello world!!")
	response.send("Hellow Cosmos!!!")
})

app.listen(port, () => {
	console.log(`Listening on port ${port}`)
})

