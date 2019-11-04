var express = require('express');
var router = express.Router();
const Rate = require('../models/rating');

/* GET rating listing. */
router.get('/', function(req, res, next) {
  User.find().sort('name').exec(function(err, ratings) {
    if (err) {
      return next(err);
    }
    res.send(ratings);
  });
});

// POST rate
router.post('/', function(req, res, next) {
    new Rate(req.body).save(function(err, savedRate) {
      if (err) {
        return next(err);
      }
  
      //debug(Created rate "${savedRate.rate}");
  
      res
        .status(201)
        // Rajouter le ${config.baseUrl} //
        .set('Location', `/ratings/${savedRate._id}`)
        .send(savedRate);
    });
  });
  
module.exports = router;