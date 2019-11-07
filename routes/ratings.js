var express = require('express');
var router = express.Router();
const Rate = require('../models/rating');

// Middleware GET api/ratings/:id
function loadRateFromParams(req, res, next) {
  Rate.findById(req.params.id).exec(function(err, rate) {
    if (err) {
      return next(err);
    } else if (!rate) {
      return res.status(404).send('No rate found with ID ' + req.params.id);
    }
    req.rate = rate;
    next();
  });
}

// GET /api/ratings
router.get('/', function(req, res, next) {
  Rate.find().sort('name').exec(function(err, ratings) {
    if (err) {
      return next(err);
    }
    res.send(ratings);
  });
});

// GET /api/ratings/:id
router.get('/:id', loadRateFromParams, function(req, res, next) {
  res.send(req.rate);
 });


// POST api/ratings
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

/* Routes en PATCH */

// Modifier un commentaire
router.patch('/:id', loadRateFromParams, function(req, res, next) {
	
	// Met à jour le commentaire du rating en fonction des params présents ou non dans req.body 
  if (req.body.comment !== undefined) {
    req.rate.comment = req.body.comment;
  }

  req.rate.save(function(err, modifiedRate) {
    if (err) {
      return next(err);
    }
    //debug(`Updated rate "${modifiedRate.comment}"`);
    res.send(modifiedRate);
  });
});

/* Routes en DELETE */

// Supprimer un rating
router.delete('/:id', loadRateFromParams, function(req, res, next) {
  req.rate.remove(function(err) {
    if (err) { return next(err); }
    res.sendStatus(204);
  });
});

/* FILTER */

// GET /api/ratings
router.get('/', function(req, res, next) {
  let query = Rate.find();
  // Filter ratings by comments
  if (ObjectId.isValid(req.query.ratings)) {
    query = query.where('comment').equals(req.query.comment);
  }
  // Limit pois to only those with a good enough rating
  //if (!isNaN(req.query.ratedAtLeast)) {
  //  query = query.where('rating').gte(req.query.ratedAtLeast);
  //}
  // Execute the query
  query.exec(function(err, comments) {
    if (err) {
      return next(err);
    }
    res.send(comments);
  });
});

module.exports = router;

// tous les ratings qu'un utilisateur a posté
// tous les ratings appartenant à un poi