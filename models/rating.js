const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Define the schema for users
const ratingSchema = new Schema({

  postedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false
  },
  poi: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Poi',
    required: false

  },
  value: {
  	type: Number, // Type validation
    required: true, // Mandatory
    minlength: [ 1, 'Rate cant be under 1' ], // Minimum length
    maxlength: [ 5, 'Rate cant be upper 5']
	},
  comment: {
  	type: String,
    minlength: [ 5, 'Comment is too short' ], // Minimum length
    maxlength: [300, 'Comment is too long']
  },
  dateAdd: { 
    type: Date, 
    default: Date.now 
  }

});
// Create the model from the schema and export it
module.exports = mongoose.model('Rating', ratingSchema);