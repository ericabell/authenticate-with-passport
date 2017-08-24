const express = require('express'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    session = require('express-session'),
    flash = require('express-flash-messages');
const bodyParser = require('body-parser');
const mustacheExpress = require('mustache-express');



const app = express();

passport.use(new LocalStrategy(
    function(username, password, done) {
        User.authenticate(username, password, function(err, user) {
            if (err) {
                return done(err)
            }
            if (user) {
                return done(null, user)
            } else {
                return done(null, false, {
                    message: "There is no user with that username and password."
                })
            }
        })
    }));

passport.serializeUser(function(user, done) {
    done(null, user.id);
});

passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(express.static('public'));
app.engine('mustache', mustacheExpress());
app.set('views', './views');
app.set('view engine', 'mustache');
app.set('layout', 'layout');

app.get('/login/', function(req, res) {
    res.render("login", {
        messages: res.locals.getMessages()
    });
});

app.post('/login/', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login/',
    failureFlash: true
}));

app.listen(3000, () => {
  console.log('Listening on 3000.');
})
