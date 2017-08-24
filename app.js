const fs = require('fs'),
    path = require('path'),
    express = require('express'),
    mustacheExpress = require('mustache-express'),
    passport = require('passport'),
    // LocalStrategy = require('passport-local').Strategy,
    TwitterStrategy = require('passport-twitter').Strategy,
    session = require('express-session'),
    bodyParser = require('body-parser'),
    User = require("./models/user"),
    flash = require('express-flash-messages'),
    mongoose = require('mongoose'),
    findOrCreate = require('mongoose-findorcreate'),
    expressValidator = require('express-validator');

ObjectId = require('mongodb').ObjectID;

let Twitter = require('twitter');

const app = express();

mongoose.connect('mongodb://localhost:27017/twitter');

app.engine('mustache', mustacheExpress());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'mustache')
app.set('layout', 'layout');
app.use('/static', express.static('static'));

passport.use(new TwitterStrategy({
        consumerKey: process.env.TWITTER_API_KEY,
        consumerSecret: process.env.TWITTER_API_SECRET,
        callbackURL: "http://localhost:3000/auth/twitter/callback"
    },
    function (token, tokenSecret, profile, done) {
        // function to get a user from the returned data
        console.log('get user from the returned data');
        console.log(token);
        console.log(tokenSecret);

        let client = new Twitter({
          consumer_key: process.env.TWITTER_API_KEY,
          consumer_secret: process.env.TWITTER_API_SECRET,
          access_token_key: process.env.TWITTER_API_ACCESS_TOKEN,
          access_token_secret: process.env.TWITTER_API_TOKEN_SECRET
        });

        client.get('favorites/list', (err, tweets, response) => {
          if(err) {
            console.log('favorites/list error');
            throw err;
          }
          console.log(tweets);
          console.log(response);
        });

        client.post('statuses/update', {status: 'Second automated tweet!'}, (err, tweet, response) => {
          if(err) {
            console.log('statuses/update error');
            throw err;
          }
          console.log(tweet);
          console.log(response);
        })

        console.log(profile);
        // save twitter user data into mongoose
        User.findOrCreate({
          provider: profile.provider,
          providerId: profile.id
        }, {
          displayName: profile.displayName
        },
        function( err, user ) {
          if (err) {
            return done(err);
          }
          console.log('Data saved to mongo!');
          done(null, user);
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    // User.findById(id, function(err, user) {
    //     done(err, user);
    // });
    done(null, id);
});

app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(expressValidator());


app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new(require('express-sessions'))({
        storage: 'mongodb',
        instance: mongoose, // optional
        host: 'localhost', // optional
        port: 27017, // optional
        db: 'test', // optional
        collection: 'sessions', // optional
        expire: 86400 // optional
    })
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function (req, res, next) {
  res.locals.user = req.user;
  next();
})

app.get('/', function(req, res) {
    console.log(req.session);
    if( req.session.passport.user ) {
      User.find({_id: ObjectId(req.session.passport.user)})
        .then( (docs) => {
          res.render('index', {user: docs})
        })
    }
})

app.get('/login/', function(req, res) {
    res.render("login", {
        messages: res.locals.getMessages()
    });
});

app.post('/login/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login/',
    failureFlash: true
}))

app.get('/register/', function(req, res) {
    res.render('register');
});

app.post('/register/', function(req, res) {
    req.checkBody('username', 'Username must be alphanumeric').isAlphanumeric();
    req.checkBody('username', 'Username is required').notEmpty();
    req.checkBody('password', 'Password is required').notEmpty();

    req.getValidationResult()
        .then(function(result) {
            if (!result.isEmpty()) {
                return res.render("register", {
                    username: req.body.username,
                    errors: result.mapped()
                });
            }
            const user = new User({
                username: req.body.username,
                password: req.body.password
            })

            const error = user.validateSync();
            if (error) {
                return res.render("register", {
                    errors: normalizeMongooseErrors(error.errors)
                })
            }

            user.save(function(err) {
                if (err) {
                    return res.render("register", {
                        messages: {
                            error: ["That username is already taken."]
                        }
                    })
                }
                return res.redirect('/');
            })
        })
});

function normalizeMongooseErrors(errors) {
    Object.keys(errors).forEach(function(key) {
        errors[key].message = errors[key].msg;
        errors[key].param = errors[key].path;
    });
}

app.get('/logout/', function(req, res) {
    req.logout();
    res.redirect('/');
});

const requireLogin = function (req, res, next) {
  if (req.user) {
    next()
  } else {
    res.redirect('/login/');
  }
}

app.get('/secret/', requireLogin, function (req, res) {
  res.render("secret");
})

// Redirect the user to Twitter for authentication.
app.get('/auth/twitter', passport.authenticate('twitter'));

// Twitter will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/twitter/callback',
    passport.authenticate('twitter', {
        successRedirect: '/',
        failureRedirect: '/login'
    }));

app.listen(3000, function() {
    console.log('Express running on http://localhost:3000/.')
});
