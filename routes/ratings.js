var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Rate = require('../models/rating');
const { notifyCount } = require('../dispatcher');
const User = require('../models/user');
const secretKey = process.env.SECRET_KEY || 'changeme';

/* Les middlewares */

// Middleware pour récupérer les informations d'un utilisateur 
function loadUserFromParams(req, res, next) {
  User.findById(req.params.id).exec(function(err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return res.status(404).send('Aucun utilisateur trouvé pour l\'ID : ' + req.params.id);
    }
    req.user = user;
    next();
  });
}

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


// Middleware pour l'authentification
function authenticate(req, res, next) {

  // Contrôle si le header est présent 
  const authorization = req.get('Authorization');
  if (!authorization) {
    return res.status(401).send('Le header d\'autorisation est manquant.');
  }

  // Contrôle que le header soit au bon format
  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).send('Le header d\'autorisation n\est pas au bon format (bearer token)');
  }

  // Extraction et vérification du JWT
  const token = match[1];
  jwt.verify(token, secretKey, function(err, payload) {
    if (err) {
      return res.status(401).send('Votre token(JsonWebToken) est invalide ou a expiré.');
    } else {
      req.currentUserId = payload.sub;
      // Passe l'ID de l'utilisateur authentifié au prochain middleware
      next(); 
    }
  });
}

/* GET ROUTES */

/**
 * @api {get} /api/ratings Retrieve ratings
 * @apiName GetRatings
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Retrieve all ratings.
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://api/rating
 *
 *     [
 *      {
 *        "pos": {
 *        "coordinates": [
 *          1,
 *          2
 *        ],
 *       "type": "Point"
 *        },
 *       "photos": [
 *       "superphoto1"
 *        ],
 *        "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *        "title": "Roller",
 *        "description": "Voici le roller",
 *        "categorie": "Art"
 *      }
 *     ]
 */
router.get('/', function(req, res, next) {
  let query = Rate.find().sort('name');
  // Filter ratings by pois
  if (req.query.poi) {
    query = query.where('poi').equals(req.query.poi);
  }
  // Filter ratings by users
  if (req.query.postedBy) {
    query = query.where('postedBy').equals(req.query.postedBy);
  }
  query.exec(function(err, ratings) {
    if (err) {
      return next(err);
    }
    res.send(ratings);
  });
});

/**
 * @api {get} /api/ratings/:id Retrieve a rating
 * @apiName GetRatings
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Retrieve a specific rating.
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://api/rating/5dc3efdb8f3f0a0e72086293
 *
 *     [
 *       {
 *       "_id": "5dc3efdb8f3f0a0e72086293",
 *       "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *       "poi": "5dc2eb36a151100485fe431b",
 *       "value": 4,
 *       "comment": "Lorem ipsum dolor sit amet",
 *       "dateAdd": "2019-11-07T10:20:11.632Z",
 *       "__v": 0
 *       },
 *     ]
 * 
 */
router.get('/:id', loadRateFromParams, function(req, res, next) {
  res.send(req.rate);
 });

/**
 * @api {post} /api/ratings Create rating
 * @apiName CreateRating
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Post a new rating.
 *
 * @apiSuccess (Response body) {String} id A unique identifier for the rating generated by the server
 *
 * @apiExample Example
 *     POST /api/rating HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *	      "postedBy" : "5dc3ef678f3f0a0e72086292",
 *	      "poi" : "5dc3dd4996488c0c8fce006d",
 *	      "value" : 4,
 *	      "comment" : "Lorem ipsum dolor sit amet"
 *     }
 *
 * @apiSuccessExample 201 Created
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: https://api/rating/5dc3ef678f3f0a0e72086292
 *
 *     {
 *       "_id": "5dc3efdb8f3f0a0e72086293",
 *       "postedBy": "5dc3ef678f3f0a0e72086292",
 *       "poi": "5dc3dd4996488c0c8fce006d",
 *       "value": 4,
 *       "comment": "Lorem ipsum dolor sit amet",
 *       "dateAdd": "2019-11-07T10:20:11.632Z",
 *       "__v": 0
 *     },
 */
router.post('/:id', authenticate, loadUserFromParams, function(req, res, next) {

  new Rate(
    {
      "postedBy" : req.params.id,
      "poi" : req.body.poi,
      "value" : req.body.value,
      "comment" : req.body.comment
    }).save(function(err, savedRate) {
    
    if (err) {
      return next(err);
    }

    res
      .status(201)
      .set('Location', `http://localhost:3000/ratings/${savedRate._id}`)
      .send(savedRate);
    });
  });

/**
 * @api {patch} /rating/:id Update a rating
 * @apiName UpdateRating
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Update a rating.
 *
 * @apiExample Example
 *     PATCH /api/rating/58b2926f5e1def0123e97bc0 HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "comment" : "Lorem ipsum dolor sit amet"
 *     }
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *      "_id": "58b2926f5e1def0123e97bc0",
 *      "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *      "poi": "5dc2eb36a151100485fe431b",
 *      "value": 4,
 *      "comment": "Lorem ipsum dolor sit amet",
 *      "dateAdd": "2019-11-07T10:20:11.632Z",
 *      "__v": 1
 *     }
 */
router.patch('/:id', authenticate, loadRateFromParams, function(req, res, next) {

  // Contrôle des autorisations : l'utilisateur doit avoir créer le rating pour le modifier //
  if (req.currentUserId !== req.rate.postedBy.toString()){
    return res.status(403).send('Vous devez avoir créé ce rating pour le modifier (PATCH).')
  }

	// Met à jour le commentaire du rating en fonction des params présents ou non dans req.body 
  if (req.body.comment !== undefined) {
    req.rate.comment = req.body.comment;
  }
  req.rate.save(function(err, modifiedRate) {
    if (err) {
      return next(err);
    }

    res.send(modifiedRate);
  });
});



/**
 * @api {delete} /api/rating/:id Delete rating
 * @apiName DeleteRating
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Permanently deletes a rating.
 *
 * @apiExample Example
 *     DELETE /api/rating/5dc3efdb8f3f0a0e72086293 HTTP/1.1
 *
 * @apiSuccessExample 204 No Content
 *     HTTP/1.1 204 No Content
 */
router.delete('/:id', authenticate, loadRateFromParams, function(req, res, next) {

  // Contrôle des autorisations : l'utilisateur doit avoir créer le rating pour le modifier //
  if (req.currentUserId !== req.rate.postedBy.toString()){
    return res.status(403).send('Vous devez avoir créé ce rating pour le supprimer.')
  }
  
  req.rate.remove(function(err) {
    if (err) { return next(err); }

    notifyCount(); 
    
    res.sendStatus(204);
  });
});

/**
 * @apiDefine RatingIdInUrlPath
 * @apiParam (URL path parameters) {String} id The unique rating identifier to retrieve
 */

/**
 * @apiDefine RatingInRequestBody
 * @apiParam (Request body) {ObjectId} _id The id of the rating
 * @apiParam (Request body) {ObjectId} postedBy The user who rate for this poi (must be unique)
 * @apiParam (Request body) {ObjectId} poi The poi of the user (must be unique)
 * @apiParam (Request body) {Number} value The value of the rate
 * @apiParam (Request body) {String} comment The comment posted user
 * @apiParam (Request body) {Date} dateAdd The rating posted date 
 */

/**
 * @apiDefine RatingInResponseBody
 * @apiParam (Response body) {ObjectId} _id The id of the rating
 * @apiParam (Response body) {ObjectId} postedBy The user who rate for this poi (must be unique)
 * @apiParam (Response body) {ObjectId} poi The poi of the user (must be unique)
 * @apiParam (Response body) {Number} value The value of the rate
 * @apiParam (Response body) {String} comment The comment posted for the user
 * @apiParam (Response body) {Date} dateAdd The rating posted date 
 */

/**
 * @apiDefine RatingNotFoundError
 *
 * @apiError {Object} 404/NotFound No rate was found corresponding to the ID in the URL path
 *
 * @apiErrorExample {json} 404 Not Found
 *     HTTP/1.1 404 Not Found
 *     Content-Type: text/plain
 *
 *     No rate found with ID 5dc3efdb8f3f0a0e72086293
 */

 /**
 * @apiDefine RatingIdInUrlPath
 * @apiParam (URL path parameters) {String} _id The unique identifier of the rate to retrieve
 */

/**
 * @apiDefine RatingValidationError
 *
 * @apiError {Object} 422/UnprocessableEntity Some ratings properties are invalid
 *
 * @apiErrorExample {json} 422 Unprocessable Entity
 *     HTTP/1.1 422 Unprocessable Entity
 *     Content-Type: application/json
 *
 *     {
 *       "message": "Rating search failed",
 *       "errors": {
 *         "rating": {
 *           "kind": "notFound",
 *           "message": "Path `rating` not found",
 *           "name": "ValidatorError",
 *           "path": "rating",
 *           "properties": {
 *             "message": "Path `{PATH}` (`{VALUE}`) not found",
 *             "path": "rating",
 *             "type": "notFound",
 *             "value": "0"
 *           },
 *         }
 *       }
 *     }
 */

module.exports = router;