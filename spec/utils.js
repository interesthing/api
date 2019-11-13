const User = require('../models/user');

exports.cleanUpUserDatabase = async function() {
  await Promise.all([
    User.deleteMany()
  ]);
};
