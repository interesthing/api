var express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var router = express.Router();
const Poi = require('../models/poi');
const Rating = require('../models/rating')
const { notifyCount } = require('../dispatcher');
const User = require('../models/user');
const secretKey = process.env.SECRET_KEY || 'changeme';


/* Les middlewares */

// Middleware to retrieve information from a poi
function loadPoisFromParams(req, res, next) {
  Poi.findById(req.params.id).exec(function(err, poi) {
    if (err) {
      return next(err);
    } else if (!poi) {
      return res.status(404).send('No poi found for ID: ' + req.params.id);
    }
    req.poi = poi;
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

// Middleware to retrieve informations from an user
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

/* GET ROUTES */

/**
 * @api {get} /api/pois Get poi's list
 * @apiName GetPois
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Retrieve all pois.
 * 
 * @apiUse PoiInResponseBody
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://localhost:3000/pois
 *
 *     {
 *        "page": 1,
 *        "pageSize": 100,
 *        "total": 2,
 *        "data": [
 *          {
 *           "photos": [
 *               "this-poi-photo"
 *           ],
 *           "_id": "5dc3dd4996488c0c8fce006d",
 *           "postedBy": "5dc03e63473ae2089f8bc480",
 *           "pos": {
 *               "coordinates": [
 *                   46.781142, 
 *                   6.647189,
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "Lorem Ipsum",
 *           "description": "Lorem ipsum dolor sit amet donelacus",
 *           "dateAdd": "2019-11-07T09:00:57.321Z",
 *           "categorie": "Art",
 *           "averageRating": 6
 *       },
 *       {
 *           "photos": [
 *               "this-poi-photo"
 *           ],
 *           "_id": "5dc3dd2a96488c0c8fce006c",
 *           "postedBy": "5dc03e63473ae2089f8bc480",
 *           "pos": {
 *               "coordinates": [
 *                   47.782152, 
 *                   6.644157,
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "Lorem Ipsum",
 *           "description": "Lorem ipsum dolor sit amet donelacus",
 *           "dateAdd": "2019-11-07T09:00:26.967Z",
 *           "categorie": "Art",
 *           "averageRating": 4
 *       }
 *   ]
*/
router.get('/', function(req, res, next) {

	  let page = parseInt(req.query.page, 10);
	  if (isNaN(page) || page < 1) {
	    page = 1;
	  }

	  let pageSize = parseInt(req.query.pageSize, 10);
	  if (isNaN(pageSize) || pageSize < 0 || pageSize > 100) {
	    pageSize = 100;
	  }

    Poi.aggregate([
      {
        $lookup: {
          from: 'ratings',
          localField: '_id',
          foreignField: 'poi',
          as: 'ratingPoi'
        }
      },
      {
        $unwind: {
        	path: '$ratingPoi',
        	preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$_id',
          postedBy: { "$first": '$postedBy' }, 
          pos: { "$first": '$pos' }, 
          photos: { "$first": '$photos' }, 
          title: { "$first": '$title' }, 
          description: { "$first": '$description' }, 
          dateAdd: { "$first": '$dateAdd' }, 
          categorie: { "$first": '$categorie' }, 
          averageRating: { $avg: "$ratingPoi.value" }
        }
      },
      {
        $sort: {
          averageRating: -1
        }
      },
      {
        $skip: (page - 1) * pageSize
      },
      {
        $limit: pageSize
      },
      {
        $lookup: {
          from: 'users',
          localField: 'postedBy',
          foreignField: '_id',
          as: 'postedByUsername'
        }
      },

      ],
      (err, poiSort) => {
      if (err) {
        return next(err);
      }

        Poi.find().count(function(err, total) {
	    if (err) { return next(err); 
	    }
	    let PoiSerialized = poiSort.map(poi => {

        const serialized = new Poi(poi).toJSON();

        serialized.averageRating = poi.averageRating;
        serialized.postedByUsername = poi.postedByUsername;

        return serialized;
      });

    	res.send(
    		{
        page: page,
        pageSize: pageSize,
        total: total,
        data: PoiSerialized
      }
    	);
      });
	});
});

/**
 * @api {post} /api/pois Create a poi
 * @apiName CreatePoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Register a new poi.
 * 
 * @apiUse PoiInRequestBody
 * @apiUse PoiInResponseBody
 * @apiUse PoiValidationError
 *
 * @apiSuccess (Response body) {String} id A unique identifier for the poi generated by the server
 *
 * @apiExample Example
 *     POST /api/pois HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "pos": {
 *           "coordinates": [
 *               46.781142, 
 *               6.647189,
 *           ],
 *           "type": "Point"
 *       },
 *       "photos": [
 *           "superphoto1"
 *       ],
 *       "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *       "title": "Lorem Ipsum",
 *       "description": "Lorem ipsum dolor sit amet donelacus",
 *       "categorie": "Art"
 *      }
 *
 * @apiSuccessExample 201 Created
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: http://localhost:3000/poi/5dc3dd4996488c0c8fce006d
 *
 *     {
 *           "photos": [
 *               "superphoto1"
 *           ],
 *           "_id": "5dc3dd4996488c0c8fce006d",
 *           "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *           "pos": {
 *               "coordinates": [
 *                   46.781142, 
 *                   6.647189,
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "Lorem Ipsum",
 *           "description": "Lorem ipsum dolor sit amet donelacus",
 *           "dateAdd": "2019-11-07T09:00:57.321Z",
 *           "categorie": "Art",
 *           "averageRating": 6
 *       }
 */

router.post('/:id', authenticate, loadUserFromParams, function(req, res, next) {

    new Poi(
    	{
        "pos" : req.body.pos,
        "photos": req.body.photos,
        "postedBy": req.params.id,
        "title": req.body.title,
        "description": req.body.description,
        "categorie": req.body.categorie
    
    }).save(function(err, savedPoi) {

    if (err) {
      return next(err);
    }

    notifyCount();

    res
      .status(201)
      .set('Location', `http://localhost:3000/pois/${savedPoi._id}`)
      .send(savedPoi);
  });
	
});

/**
 * @api {get} /api/pois/:id Get a specific poi
 * @apiName GetPoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Get a specific poi.
 * 
 * @apiUse PoiInResponseBody
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://localhost:3000/pois/5dc3dd4996488c0c8fce006d
 *
 *     {
 *        "page": 1,
 *        "pageSize": 100,
 *        "total": 2,
 *        "data": [
 *          {
 *           "photos": [
 *               "this-poi-photo"
 *           ],
 *           "_id": "5dc3dd4996488c0c8fce006d",
 *           "postedBy": "5dc03e63473ae2089f8bc480",
 *           "pos": {
 *               "coordinates": [
 *                   46.781142, 
 *                   6.647189,
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "Lorem Ipsum",
 *           "description": "Lorem ipsum dolor sit amet donelacus",
 *           "dateAdd": "2019-11-07T09:00:57.321Z",
 *           "categorie": "Art",
 *           "averageRating": 6
 *       }
 */
router.get('/:id', loadPoisFromParams, function(req, res, next) {

	    Poi.aggregate([
	    	  {
    		$match: { _id: req.poi._id }
  			},
      {
        $lookup: {
          from: 'ratings',
          localField: '_id',
          foreignField: 'poi',
          as: 'ratingPoi'
        }
      },
      {
        $unwind: {
        	path: '$ratingPoi',
        	preserveNullAndEmptyArrays: true
        }
      },
      {
      	// regrouper 
        $group: {
          _id: '$_id',
          postedBy: { "$first": '$postedBy' }, 
          pos: { "$first": '$pos' }, 
          photos: { "$first": '$photos' }, 
          title: { "$first": '$title' }, 
          description: { "$first": '$description' }, 
          dateAdd: { "$first": '$dateAdd' }, 
          categorie: { "$first": '$categorie' }, 
          averageRating: { $avg: "$ratingPoi.value" },
          totalRating: { $sum: 1 },
        }
      },
      {
      $lookup: {
        from: 'users',
        localField: 'postedBy',
        foreignField: '_id',
        as: 'postedByUsername'
      }
    }
      ],
      (err, poiWithRating) => {
      if (err) {
        return next(err);
      }

res.send(poiWithRating.map(poi => {

        const serialized = new Poi(poi).toJSON();

        serialized.ratingPoi = poi.averageRating;
        serialized.postedByUsername = poi.postedByUsername;
        serialized.totalRating = poi.totalRating;


        return serialized;
      }));
  	});
});

/**
 * @api {delete} /api/pois/:id Delete a poi
 * @apiName DeletePoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Permanently deletes a poi.
 * 
 * @apiUse PoiIdInUrlPath
 * @apiUse PoiNotFoundError
 *
 * @apiExample Example
 *     DELETE /api/pois/5dc3dd4996488c0c8fce006d HTTP/1.1
 *
 * @apiSuccessExample 204 No Content
 *     HTTP/1.1 204 No Content
 */
router.delete('/:id', authenticate, loadPoisFromParams, function(req, res, next) {

    if (req.currentUserId !== req.poi.postedBy.toString()){
      return res.status(403).send('You must have created this rating to delete it.')
    }
  
  let poiId = req.params.id;

	Rating.deleteMany({poi:poiId}, function(err) {

    req.poi.remove(function(err) {
      if (err) {
        return next(err);
      }

    notifyCount();

    res.sendStatus(204);
      });

	})
});

/**
 * @api {patch} api/pois/:id Partially update a poi
 * @apiName UpdatePoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Partially update a poi.
 * 
 * @apiUse PoiInRequestBody
 * @apiUse PoiInResponseBody
 * @apiUse PoiIdInUrlPath
 * @apiUse PoiNotFoundError
 *
 * @apiExample Example
 *     PATCH /api/pois/5dc3dd4996488c0c8fce006d HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "title": "Ipsum dolor amet sit",
 *       "description": "Lorem ipsum dolor sit amet"
 *     }
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *        "page": 1,
 *        "pageSize": 100,
 *        "total": 2,
 *        "data": [
 *          {
 *           "photos": [
 *               "this-poi-photo"
 *           ],
 *           "_id": "5dc3dd4996488c0c8fce006d",
 *           "postedBy": "5dc03e63473ae2089f8bc480",
 *           "pos": {
 *               "coordinates": [
 *                   46.781142, 
 *                   6.647189,
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "Ipsum dolor amet sit",
 *           "description": "Lorem ipsum dolor sit amet",
 *           "dateAdd": "2019-11-08T10:00:57.321Z",
 *           "categorie": "Art",
 *           "averageRating": 6
 *       }
 */
router.patch('/:id', authenticate, loadPoisFromParams, function(req, res, next) {

  if (req.currentUserId !== req.poi.postedBy.toString()){
    return res.status(403).send('You must have created this rating to modify it (PATCH).')
  }

 	if (req.body.photos !== undefined) {
    req.poi.photos = req.body.photos;
	}
	if (req.body.title !== undefined) {
    req.poi.title = req.body.title;
	}
	if (req.body.description !== undefined) {
    req.poi.description = req.body.description;
	}
	if (req.body.categorie !== undefined) {
    req.poi.categorie = req.body.categorie;
	}
	if (req.body.pos !== undefined) {
		return res.status(404).send('This element cannot be changed');
	}

	req.poi.save(function(err, savedPoi) {
  if (err) {
      return next(err);
  }
    res.send(savedPoi);
  });
});

/**
 * @api {put} /api/pois/:id Update a poi
 * @apiName UpdatePoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Replaces all poi's data.
 * 
 * @apiUse PoiInRequestBody
 * @apiUse PoiInResponseBody
 * @apiUse PoiIdInUrlPath
 * @apiUse PoiNotFoundError
 * @apiUse PoiValidationError
 *
 * @apiExample Example
 *     PUT /api/pois/5dc3dd4996488c0c8fce006d HTTP/1.1
 *     Content-Type: application/json
 *
 *       {
 *       "pos": {
 *           "coordinates": [
 *               46.781142, 
 *               6.647189,
 *           ],
 *           "type": "Point"
 *       },
 *       "photos": [
 *           "nice-photo"
 *       ],
 *       "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *           "title": "Ipsum dolor amet sit",
 *           "description": "Lorem ipsum dolor sit amet",
 *       "categorie": "Art"
 *      }
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *        "page": 1,
 *        "pageSize": 100,
 *        "total": 2,
 *        "data": [
 *          {
 *           "photos": [
 *               "this-poi-photo"
 *           ],
 *           "_id": "5dc3dd4996488c0c8fce006d",
 *           "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *           "pos": {
 *               "coordinates": [
 *                   46.781142, 
 *                   6.647189,
 *               ],
 *               "type": "Point"
 *           },
*            "title": "Ipsum dolor amet sit",
 *           "description": "Lorem ipsum dolor sit amet"
 *           "dateAdd": "2019-11-07T10:00:57.321Z",
 *           "categorie": "Art",
 *           "averageRating": 6
 *       }
 */
router.put('/:id', authenticate, loadPoisFromParams, function(req, res, next) {

  if (req.currentUserId !== req.poi.postedBy.toString()){
    return res.status(403).send('You must have created this rating to modify it (PUT).')
  }

  req.poi.photos = req.body.photos;
	req.poi.title = req.body.title;
	req.poi.description = req.body.description;
	req.poi.categorie = req.body.categorie;

  req.poi.save(function(err, savedPoi) {
  if (err) {
      return next(err);
  }

  res.send(savedPoi);

});

});

/**
 * @apiDefine PoiIdInUrlPath
 * @apiParam (URL path parameters) {String} id The unique poi identifier to retrieve
 */

/**
 * @apiDefine PoiInRequestBody
 * @apiParam (Request body) {ObjectId} _id The id of the poi
 * @apiParam (Request body) {ObjectId} postedBy The user who posted this poi (must be unique)
 * @apiParam (Request body) {String} type The poi marker type on the map
 * @apiParam (Request body) {Number} coordinates The coordinates map values of the poi
 * @apiParam (Request body) {String} photos The image who represented the poi
 * @apiParam (Request body) {String} title The poi title
 * @apiParam (Request body) {String {5..300}} description The poi description
 * @apiParam (Request body) {Date} title The poi posted date
 * @apiParam (Request body) {String {'Art', 'Funny', 'WTF!', 'Spots', 'Shortcuts'}} categorie The poi category
 */

/**
 * @apiDefine PoiInResponseBody
 * @apiParam (Response body) {ObjectId} _id The id of the poi
 * @apiParam (Response body) {ObjectId} postedBy The user who posted this poi (must be unique)
 * @apiParam (Response body) {String} type The poi marker type on the map
 * @apiParam (Response body) {Number} coordinates The coordinates map values of the poi
 * @apiParam (Response body) {String} photos The image who represented the poi
 * @apiParam (Response body) {String} title The poi title
 * @apiParam (Response body) {String} description The poi description
 * @apiParam (Response body) {Date} title The poi posted date
 * @apiParam (Response body) {String} categorie The poi category
 */

/**
 * @apiDefine PoiNotFoundError
 *
 * @apiError {Object} 404/NotFound No poi was found corresponding to the ID in the URL path
 *
 * @apiErrorExample {json} 404 Not Found
 *     HTTP/1.1 404 Not Found
 *     Content-Type: text/plain
 *
 *     No poi found with ID 5dc3dd4996488c0c8fce006d
 */

 /**
 * @apiDefine PoiIdInUrlPath
 * @apiParam (URL path parameters) {String} _id The unique identifier of the poi to get
 */

/**
 * @apiDefine PoiValidationError
 *
 * @apiError {Object} 422/UnprocessableEntity Some poi properties are invalid
 *
 * @apiErrorExample {json} 422 Unprocessable Entity
 *     HTTP/1.1 422 Unprocessable Entity
 *     Content-Type: application/json
 *
 *     {
 *       "message": "Poi search failed",
 *       "errors": {
 *         "rating": {
 *           "kind": "notFound",
 *           "message": "Path `poi` not found",
 *           "name": "ValidatorError",
 *           "path": "poi",
 *           "properties": {
 *             "message": "Path `{PATH}` (`{VALUE}`) not found",
 *             "path": "poi",
 *             "type": "notFound",
 *             "value": "0"
 *           },
 *         }
 *       }
 *     }
 */

module.exports = router;