const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Define the schema for users
const userSchema = new Schema({

  username: {
  	type: String, // Type validation
    required: true, // Mandatory
    unique: true,
    minlength: [ 3, 'Username is too short' ], // Minimum length
    maxlength: [20, 'Username is too long']
	},
  email: {
  	type: String, 
  	unique: true,
  	required: true,
    minlength: [ 3, 'Username is too short' ], // Minimum length
    maxlength: [100, 'Username is too long']
  },
  password: {
    type: String,
    required: true
  },
  imgProfil: {
    type: String
  }
});
// Create the model from the schema and export it
module.exports = mongoose.model('User', userSchema);