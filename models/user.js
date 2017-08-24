const mongoose = require('mongoose');
const findOrCreate = require('mongoose-findorcreate');

mongoose.Promise = require('bluebird');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    provider: {
      type: String, required: true
    },
    providerId: {
      type: String, required: true
    },
    displayName: {
      type: String, required: true
    }
});

userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

module.exports = User;
