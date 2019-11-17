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

// Middleware récupérant les informations d'un POI
function loadPoisFromParams(req, res, next) {
  Poi.findById(req.params.id).exec(function(err, poi) {
    if (err) {
      return next(err);
    } else if (!poi) {
      return res.status(404).send('Aucun POI trouvé pour l\'ID ' + req.params.id);
    }
    req.poi = poi;
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

/* GET ROUTES */

/**
 * @api {get} /api/pois Retrieve pois list
 * @apiName GetPois
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Retrieve all pois.
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://api/poi
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
 *                   3,
 *                   4
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "A taste from Ireland",
 *           "description": "Le meilleur de la musique irlandaise",
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
 *                   3,
 *                   4
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "La Cave",
 *           "description": "La teuf de ouf",
 *           "dateAdd": "2019-11-07T09:00:26.967Z",
 *           "categorie": "Art",
 *           "averageRating": 4
 *       }
 *   ]
 */
/* agrégation faites 
PAGINATION à faire ! */
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
      }
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
 * @api {post} /api/poi Create a poi
 * @apiName CreatePoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Register a new poi.
 *
 * @apiSuccess (Response body) {String} id A unique identifier for the poi generated by the server
 *
 * @apiExample Example
 *     POST /api/poi HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "pos": {
 *           "coordinates": [
 *               1,
 *               2
 *           ],
 *           "type": "Point"
 *       },
 *       "photos": [
 *           "superphoto1"
 *       ],
 *       "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *       "title": "A taste from Ireland",
 *       "description": "Le meilleur de la musique",
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
 *                   1,
 *                   2
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "A taste from Ireland",
 *           "description": "Le meilleur de la musique",
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
 * @api {get} /api/pois Retrieve a specific poi
 * @apiName GetPois
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Retrieve a specific poi.
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://localhost:3000/poi/5dc3dd4996488c0c8fce006d
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
 *                   3,
 *                   4
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "A taste from Ireland",
 *           "description": "Le meilleur de la musique irlandaise",
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
          averageRating: { $avg: "$ratingPoi.value" }
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

        return serialized;
      }));
  	});
});

/**
 * @api {delete} /api/poi/:id Delete a poi
 * @apiName DeletePoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Permanently deletes a apoi.
 *
 * @apiExample Example
 *     DELETE /api/poi/5dc3dd4996488c0c8fce006d HTTP/1.1
 *
 * @apiSuccessExample 204 No Content
 *     HTTP/1.1 204 No Content
 */
router.delete('/:id', authenticate, loadPoisFromParams, function(req, res, next) {

    // Contrôle des autorisations : l'utilisateur doit avoir créer le POI pour le supprimer //
    if (req.currentUserId !== req.poi.postedBy.toString()){
      return res.status(403).send('Vous devez avoir créé ce POI pour le supprimer.')
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
 * @api {patch} /poi/:id Partially update a poi
 * @apiName UpdatePoi
 * @apiGroup Poi
 * @apiVersion 1.0.0
 * @apiDescription Partially update a poi.
 *
 * @apiExample Example
 *     PATCH /api/poi/5dc3dd4996488c0c8fce006d HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "title": "A taste from another world",
 *       "description": "Le meilleur de la musique actuelle"
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
 *                   3,
 *                   4
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "A taste from another world",
 *           "description": "Le meilleur de la musique actuelle",
 *           "dateAdd": "2019-11-07T10:00:57.321Z",
 *           "categorie": "Art",
 *           "averageRating": 6
 *       }
 */
router.patch('/:id', authenticate, loadPoisFromParams, function(req, res, next) {

  // Contrôle des autorisations : l'utilisateur doit avoir créer le POI pour le modifier //
  if (req.currentUserId !== req.poi.postedBy.toString()){
    return res.status(403).send('Vous devez avoir créé ce POI pour le modifier (PATCH).')
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
 * @apiDescription Replaces all the poi's data.
 *
 * @apiExample Example
 *     PUT /api/pois/5dc3dd4996488c0c8fce006d HTTP/1.1
 *     Content-Type: application/json
 *
 *       {
 *       "pos": {
 *           "coordinates": [
 *               3,
 *               4
 *           ],
 *           "type": "Point"
 *       },
 *       "photos": [
 *           "nice-photo"
 *       ],
 *       "postedBy": "5dc2e88f7f63bc03bb1c04c1",
 *       "title": "Hello World",
 *       "description": "Here is a nice description",
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
 *                   3,
 *                   4
 *               ],
 *               "type": "Point"
 *           },
 *           "title": "Hello World",
 *           "description": "Here is a nice description",
 *           "dateAdd": "2019-11-07T10:00:57.321Z",
 *           "categorie": "Art",
 *           "averageRating": 6
 *       }
 */
router.put('/:id', authenticate, loadPoisFromParams, function(req, res, next) {

   // Contrôle des autorisations : l'utilisateur doit avoir créer le POI pour le modifier //
  if (req.currentUserId !== req.poi.postedBy.toString()){
    return res.status(403).send('Vous devez avoir créé ce POI pour le modifier (PUT).')
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
 * @apiParam (Request body) {String} description The poi description
 * @apiParam (Request body) {Date} title The poi posted date
 * @apiParam (Request body) {String} categorie The poi category
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
 * @apiParam (URL path parameters) {String} _id The unique identifier of the poi to retrieve
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