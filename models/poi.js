const mongoose = require('mongoose');
const Schema = mongoose.Schema;


function validateGeoJsonCoordinates(value) {
  return Array.isArray(value) && value.length >= 2 && value.length <= 3 && value[0] >= -180 && value[0] <= 180 && value[1] >= -90 && value[1] <= 90;
}

// Define the schema for Poi
const poiSchema = new Schema({

  postedBy: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  pos: {
    type: {
      type: String,
      required: true,
      enum: [ 'Point' ]
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: validateGeoJsonCoordinates,
        message: '{VALUE} is not a valid longitude/latitude(/altitude) coordinates array'
      }
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

poiSchema.index({ pos: '2dsphere' });

// Create the model from the schema and export it
module.exports = mongoose.model('Poi', poiSchema);