const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Define the schema for users
const poiSchema = new Schema({

  postedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  pos: {
    type: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
      }
  },
  photos: [{
    type: String,
  }],
  title: {
    type: String,
    required: true
  },
  description: {
  	type: String, 
    minlength: [ 5, 'Description is too short' ], // Minimum length
    maxlength: [300, 'Description is too long']
  },
  dateAdd: { 
    type: Date, 
    default: Date.now
  },
  categorie: {
    type: String,
    enum: ['Art', 'Funny', 'WTF!', 'Spots', 'Shortcuts' ]
  }

});
// Create the model from the schema and export it
module.exports = mongoose.model('Poi', poiSchema);