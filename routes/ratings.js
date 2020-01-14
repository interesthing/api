var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Rate = require('../models/rating');
const { notifyCount } = require('../dispatcher');
const User = require('../models/user');
const secretKey = process.env.SECRET_KEY || 'changeme';

/* Middlewares */

// Middleware to retrieve information from an user
function loadUserFromParams(req, res, next) {
  User.findById(req.params.id).exec(function(err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return res.status(404).send('No user found for ID : ' + req.params.id);
    }
    req.user = user;
    next();
  });
}

// Middleware to retrieve informations from a rate
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

// Authentication Middleware 
function authenticate(req, res, next) {

  // Check if the header is present
  const authorization = req.get('Authorization');
  if (!authorization) {
    return res.status(401).send('The authorization header is missing.');
  }

  // Check that the header is in the correct format
  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).send('Authorization header is not a bearer token.');
  }

  // Extraction and verification of the JWT
  const token = match[1];
  jwt.verify(token, secretKey, function(err, payload) {
    if (err) {
      return res.status(401).send('Your token(JSONwebtoken) is invalid or has expired.');
    } else {
      req.currentUserId = payload.sub;
      next(); 
    }
  });
}

/* GET ROUTES */

/**
 * @api {get} /api/ratings Get all ratings
 * @apiName GetRatings
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Get a paginated list of ratings.
 * 
 * @apiUse RatingInResponseBody
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://localhost:3000/ratings
 *
 *     [
 *
 *      {
 *        "_id": "5dc3efdb8f3f0a0e72086293",
 *        "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *        "poi": "5dc2eb36a151100485fe431b",
 *        "value": 5,
 *        "comment": "Lorem ipsum dolor sit amet",
 *        "dateAdd": "2019-11-07T10:20:11.632Z",
 *        "__v": 0
 *      },
 * 
 *      {
 *        "_id": "5dc3f0dd8f3f0a0e72086298",
 *        "postedBy": "5dc3ef678f3f0a0e72086292",
 *        "poi": "5dc3dd2a96488c0c8fce006c",
 *        "value": 4,
 *        "comment": "Lorem ipsum dolor sit amet",
 *        "dateAdd": "2019-11-07T10:24:29.068Z",
 *        "__v": 0
 *      },
 * 
 *      {
 *        "_id": "5dc3f1b18f3f0a0e7208629e",
 *        "postedBy": "5dc3ef678f3f0a0e72086092",
 *        "poi": "5dc3dd4996488c0c8fce006d",
 *        "value": 4,
 *        "comment": "Lorem ipsum dolor sit amet",
 *        "dateAdd": "2019-11-07T10:28:01.348Z",
 *        "__v": 0
 *      }
 *   ]
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
 * @api {get} /api/ratings/:id Get a rating
 * @apiName GetRatings
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Get a rating.
 * 
 * @apiUse RatingIdInUrlPath
 * @apiUse RatingInResponseBody
 * @apiUse RatingNotFoundError
 * 
 * @apiExample Example
 *     GET /api/ratings/5dc3efdb8f3f0a0e72086293
 * 
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://api/ratings/5dc3efdb8f3f0a0e72086293
 *
 *       {
 *       "_id": "5dc3efdb8f3f0a0e72086293",
 *       "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *       "poi": "5dc2eb36a151100485fe431b",
 *       "value": 4,
 *       "comment": "Lorem ipsum dolor sit amet",
 *       "dateAdd": "2019-11-07T10:20:11.632Z",
 *       "__v": 0
 *       }
 * 
 */
router.get('/:id', loadRateFromParams, function(req, res, next) {
  res.send(req.rate);
 });

/**
 * @api {post} /api/ratings Create a rating
 * @apiName CreateRating
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Post a new rating.
 * 
 * @apiUse RatingInRequestBody
 * @apiUse RatingInResponseBody
 * @apiUse RatingValidationError
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
 *     Location: https://api/ratings/5dc3efdb8f3f0a0e72086293
 *
 *     {
 *       "_id": "5dc3efdb8f3f0a0e72086293",
 *       "postedBy": "5dc3ef678f3f0a0e72086292",
 *       "poi": "5dc3dd4996488c0c8fce006d",
 *       "value": 4,
 *       "comment": "Lorem ipsum dolor sit amet",
 *       "dateAdd": "2019-11-07T10:20:11.632Z",
 *       "__v": 0
 *     }
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
    
    notifyCount();

    res
      .status(201)
      .set('Location', `http://localhost:3000/ratings/${savedRate._id}`)
      .send(savedRate);
    });
  });

/**
 * @api {patch} /ratings/:id Update a rating
 * @apiName UpdateRating
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Update a rating.
 * 
 * @apiUse RatingInRequestBody
 * @apiUse RatingInResponseBody
 * @apiUse RatingIdInUrlPath
 * @apiUse RatingNotFoundError
 *
 * @apiExample Example
 *     PATCH /api/rating/5dc3efdb8f3f0a0e72086293 HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "comment" : "Sit amet lorem dolor ipsum"
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
 *      "comment": "Sit amet lorem dolor ipsum",
 *      "dateAdd": "2019-11-07T10:21:11.632Z",
 *      "__v": 1
 *     }
 */
router.patch('/:id', authenticate, loadRateFromParams, function(req, res, next) {

  if (req.currentUserId !== req.rate.postedBy.toString()){
    return res.status(403).send('You must have created this rating to modify it (PATCH).')
  }

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
 * @api {delete} /api/ratings/:id Delete rating
 * @apiName DeleteRating
 * @apiGroup Rating
 * @apiVersion 1.0.0
 * @apiDescription Permanently deletes a rating.
 * 
 * @apiUse RatingIdInUrlPath
 * @apiUse RatingNotFoundError
 *
 * @apiExample Example
 *     DELETE /api/ratings/58b2926f5e1def0123e97bc0 HTTP/1.1
 *
 * @apiSuccessExample 204 No Content
 *     HTTP/1.1 204 No Content
 */
router.delete('/:id', authenticate, loadRateFromParams, function(req, res, next) {

  if (req.currentUserId !== req.rate.postedBy.toString()){
    return res.status(403).send('You must have created this rating to delete it.')
  }
  
  req.rate.remove(function(err) {
    if (err) { return next(err); }

    notifyCount(); 
    
    res.sendStatus(204);
  });
});


/**
 * @apiDefine RatingIdInUrlPath
 * @apiParam (URL path parameters) {String} id Rating identifier to get
 */


/**
 * @apiDefine RatingInRequestBody
 * @apiParam (Request body) {ObjectId} _id Rating identifier
 * @apiParam (Request body) {ObjectId} postedBy The user who rate for this poi (must be unique)
 * @apiParam (Request body) {ObjectId} poi Poi posted by user (must be unique)
 * @apiParam (Request body) {Number{1..5}} value Rate value
 * @apiParam (Request body) {String{5..300}} comment Comment posted by user
 * @apiParam (Request body) {Date} dateAdd Rating poste date 
 */


/**
 * @apiDefine RatingInResponseBody
 * @apiParam (Response body) {ObjectId} _id Rating identifier
 * @apiParam (Response body) {ObjectId} postedBy The user who rate for this poi (must be unique)
 * @apiParam (Response body) {ObjectId} poi Poi posted by user (must be unique)
 * @apiParam (Response body) {Number} value Rate value
 * @apiParam (Response body) {String} comment Comment posted by user
 * @apiParam (Response body) {Date} dateAdd Rating poste date
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
 *     No rate found with ID 58b2926f5e1def0123e97bc0
 */


 /**
 * @apiDefine RatingIdInUrlPath
 * @apiParam (URL path parameters) {String} _id The unique identifier of the rate to get
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
