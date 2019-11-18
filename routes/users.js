var express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var router = express.Router();
const User = require('../models/user');
const secretKey = process.env.SECRET_KEY || 'changeme';
const { notifyCount } = require('../dispatcher');

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

function authenticate(req, res, next) {

  const authorization = req.get('Authorization');
  if (!authorization) {
    return res.status(401).send('Le header d\'autorisation est manquant.');
  }

  const match = authorization.match(/^Bearer (.+)$/);
  if (!match) {
    return res.status(401).send('Le header d\'autorisation n\est pas au bon format (bearer token)');
  }

  const token = match[1];

  jwt.verify(token, secretKey, function(err, payload) {
    if (err) {
      return res.status(401).send('Votre token(JsonWebToken) est invalide ou a expiré.');
    } else {
      req.currentUserId = payload.sub;
      next(); 
	}
  });

}

/**
 * @api {get} /api/users Users list
 * @apiName GetUsers
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Get all subscribed users.
 * 
 * @apiUse UserInResponseBody
 * 
 * @apiExample Example
 * 		GET /api/users
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *     Link: http://localhost:3000/users
 *
 *     [
 *       {
 *         "_id": "5dc3ef678f3f0a0e72086292",
 *         "username": "lorem.ipsum",
 *         "email": "lorem.ipsum@email.com",
 *         "imgProfil": "profile-photo.jpg",
 *         "__v": 0
 *       },
 * 		 {
 *         "_id": "5dc3ef678f3f0a0e63548579",
 *         "username": "dolor.sit",
 *         "email": "dolor.sit@email.com",
 *         "imgProfil": "profile-photo.jpg",
 *         "__v": 0
 *       },
 *     ]
 * 
 */
router.get('/', function(req, res, next) {

  User.find().sort('username').exec(function(err, users) {
    if (err) {
      return next(err);
    }
    res.send(users);
  });

});

/**
 * @api {get} /api/users/:id Get an user
 * @apiName GetUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Get an user.
 * 
 * @apiUse UserIdInUrlPath
 * @apiUse UserInResponseBody
 * @apiUse UserNotFoundError
 *
 * @apiExample Example
 *     GET /api/users/5dc3ef678f3f0a0e72086292
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "_id": "5dc3ef678f3f0a0e72086292",
 *       "username": "lorem.ipsum",
 *       "email": "lorem.ipsum@email.com",
 *       "imgProfil": "profile-photo.jpg",
 *       "__v": 0
 *     }
 */
router.get('/:id', loadUserFromParams, function(req, res, next) {
 res.send(req.user);
});

/**
 * @api {post} /api/users Create an user
 * @apiName CreateUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Create a new user.
 * 
 * @apiUse UserInRequestBody
 * @apiUse UserInResponseBody
 * @apiUse UserValidationError
 *
 * @apiSuccess (Response body) {String} id A unique identifier for the user has been generated by the server
 *
 * @apiExample Example
 *     POST /api/user HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "username": "lorem.ipsum",
 *       "email": "lorem.ipsum@email.com",
 *       "password": "123456789",
 * 		 "imgProfil": "profile-photo.jpg"
 *     }
 *
 * @apiSuccessExample 201 Created
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: http://localhost:3000/users/5dc3ef678f3f0a0e72086292
 *
 *     {
 *       "_id": "5dc3ef678f3f0a0e72086292",
 *       "username": "lorem.ipsum",
 *       "email": "lorem.ipsum@email.com",
 *       "imgProfil": "profile-photo.jpg",
 *       "__v": 0
 *     }
 */
router.post('/', function(req, res, next) {

	const plainPassword = req.body.password;
  	const saltRounds = 10;
  	
  	bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
	    if (err) {
	      return next(err);
	    }

	    const newUser = new User(req.body);
	    newUser.password = hashedPassword;
	    newUser.save(function(err, savedUser) {

		      if (err) {
		        return next(err);
		      }

		    notifyCount(); 
		    res.status(201)
		      	.set('Location', `/users/${savedUser._id}`)
		      	.send(savedUser);
	  	});
	});

});

/**
 * @api {post} api/users/login Login an user
 * @apiName UserLogin
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Sign in and authenticate an user.
 * 
 * @apiUse UserInRequestBody
 * @apiUse UserInResponseBody
 * @apiUse UserValidationError
 * 
 * @apiSuccess (Response body) {String} id The user has been connected
 * 
 * @apiExample Example
 *     POST /api/users HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "username": "lorem.ipsum",
 *       "password": "123456789",
 *     }
 *
 * @apiSuccessExample 201 Created
 *     HTTP/1.1 201 Created
 *     Content-Type: application/json
 *     Location: https://localhost:3000/api/users/5dc3ef678f3f0a0e72086292
 *
 *     {
 *       "_id": "5dc3ef678f3f0a0e72086292",
 *       "username": "lorem.ipsum",
 *       "email": "lorem.ipsum@email.com",
 *       "imgProfil": "profile-photo.jpg",
 *       "__v": 0
 *     }
 * 
 */
router.post('/login', function(req, res, next) {

	User.findOne({ username: req.body.username }).exec(function(err, user) {
	    if (err) {
	      return next(err);
	    } else if (!user) {
	      return res.sendStatus(401);
	    }

	    bcrypt.compare(req.body.password, user.password, function(err, valid) {
	      if (err) {
	        return next(err);
	      } else if (!valid) {
	        return res.sendStatus(401);
	      }

	      const exp = (new Date().getTime() + 7 * 24 * 3600 * 1000) / 1000;
	      const claims = { sub: user._id.toString(), exp: exp };

	      jwt.sign(claims, secretKey, function(err, token){
		        if (err) { return next(err); }
			        res.send({ token: token });
		    });
	    });
  	})
});

/**
 * @api {put} /api/users/:id Update an user
 * @apiName UpdateUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Update an user (The user must be authentificate and only himself can change).
 * 
 * @apiUse UserInRequestBody
 * @apiUse UserInResponseBody
 * @apiUse UserIdInUrlPath
 * @apiUse UserNotFoundError
 * @apiUse UserValidationError
 *
 * @apiExample Example
 *     PUT /api/user/5dc3ef678f3f0a0e72086292 HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "username": "ipsum.lorem",
 *       "email": "ipsum.lorem@email.com",
 *       "password": "987654321",
 * 		 "imgProfil": "photo-profile.jpg"
 *     }
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "_id": "5dc3ef678f3f0a0e72086292",
 *       "username": "ipsum.lorem",
 *       "email": "ipsum.lorem@email.com",
 *       "imgProfil": "photo-profile.jpg",
 *       "__v": 0
 *     }
 */
router.put('/:id', authenticate, loadUserFromParams, function(req, res, next){
    if (req.currentUserId !== req.user._id.toString()){
      return res.status(403).send('Vous n\'avez pas le droit de modification(PUT) sur cette ressource.')
    }

	const plainPassword = req.body.password;
  	const saltRounds = 10;

  	bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
	    if (err) {
	      return next(err);
	    }

	req.user.password = hashedPassword;
	req.user.username = req.body.username;
	req.user.email = req.body.email;
	req.user.imgProfil = req.body.imgProfil;

	req.user.save(function(err, updatedUser){
	if (err){
		      return next(err);
		    }
		    res.send(updatedUser);
	    });
	});
	  
});


/**
 * @api {patch} api/users/:id Update user
 * @apiName UpdateUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Replace specifics user's data (The identifier must be informed).
 * 
 * @apiUse UserInRequestBody
 * @apiUse UserInResponseBody
 * @apiUse UserIdInUrlPath
 * @apiUse UserNotFoundError
 * @apiUse UserValidationError
 *
 * @apiExample Example
 *     PATCH /api/user/58b2926f5e1def0123e97bc0 HTTP/1.1
 *     Content-Type: application/json
 *
 *     {
 *       "username": "lorem.amet",
 *     }
 *
 * @apiSuccessExample 200 OK
 *     HTTP/1.1 200 OK
 *     Content-Type: application/json
 *
 *     {
 *       "_id": "5dc3ef678f3f0a0e72086292",
 *       "username": "lorem.amet",
 *       "email": "lorem.ipsum@email.com",
 * 		 "imgProfil": "mon-autre-photo.jpg",
 *       "__v": 1
 *     }
 */
router.patch('/:id', authenticate, loadUserFromParams, function(req, res, next) {

    if (req.currentUserId !== req.user._id.toString()){
      return res.status(403).send('Vous n\'avez pas le droit de modification partielle (PATCH) sur cette ressource.')
    }
	
	if (req.body.username !== undefined) {
		req.user.username = req.body.username;
	}

	if (req.body.email !== undefined) {
		req.user.email = req.body.email;
	}

	if (req.body.imgProfil !== undefined) {
	    req.user.imgProfil = req.body.imgProfil;
	}

	if (req.body.password !== undefined) {
		const plainPassword = req.body.password;
	  	const saltRounds = 10;

	  	bcrypt.hash(plainPassword, saltRounds, function(err, hashedPassword) {
		    if (err) {
		     	return next(err);
		    }
	   	 	req.user.password = hashedPassword;
	  		
			req.user.save(function(err, modifiedPerson){
		    	if (err) {
		      		return next(err);
		    	}
		    res.send(modifiedPerson);

		  	});
	  	});
	  }else{

	  	req.user.save(function(err, modifiedPerson){
	    if (err) {
	      return next(err);
	    }
	    res.send(modifiedPerson);
	  });
  	}
});

/**
 * @api {delete} /api/users/:id Delete an user
 * @apiName DeleteUser
 * @apiGroup User
 * @apiVersion 1.0.0
 * @apiDescription Deletes an user permanently.
 * 
 * @apiUse UserIdInUrlPath
 * @apiUse UserNotFoundError
 *
 * @apiExample Example
 *     DELETE /api/users/5dc3ef678f3f0a0e72086292 HTTP/1.1
 *
 * @apiSuccessExample 204 No Content
 *     HTTP/1.1 204 No Content
 */
router.delete('/:id', authenticate, loadUserFromParams, function(req, res, next) {
	
    if (req.currentUserId !== req.user._id.toString()){
      return res.status(403).send('Vous n\'avez pas le droit de suppression (DELETE) sur cette ressource.')
    }
	
  	req.user.remove(function(err) {
    if (err) { return next(err); }
    	notifyCount(); 
    	res.sendStatus(204);
  	});

});


/**
 * @apiDefine UserIdInUrlPath
 * @apiParam (URL path parameters) {String} id Unique user identifier to get
 */

/**
 * @apiDefine UserInRequestBody
 * @apiParam (Request body) {String{3..20}} username User username (must be unique)
 * @apiParam (Request body) {String{3..100}} email User email (must be unique)
 * @apiParam (Request body) {String} password User password
 * @apiParam (Request body) {String} imgProfil User profile image
 */

/**
 * @apiDefine UserInResponseBody
 * @apiSuccess (Response body) {String} _id User id
 * @apiSuccess (Response body) {String} username User username
 * @apiSuccess (Response body) {String} email User email
 * @apiSuccess (Response body) {String} imgProfil User profile image
 * @apiSuccess (Response body) {String} __v User version
 */

/**
 * @apiDefine UserNotFoundError
 *
 * @apiError {Object} 404/NotFound No user was found corresponding to the ID in the URL path
 *
 * @apiErrorExample {json} 404 Not Found
 *     HTTP/1.1 404 Not Found
 *     Content-Type: text/plain
 *
 *     No user found with ID 5dc3ef678f3f0a0e72086292
 */

/**
 * @apiDefine UserValidationError
 *
 * @apiError {Object} 422/UnprocessableEntity Some of the user's properties are invalid
 *
 * @apiErrorExample {json} 422 Unprocessable Entity
 *     HTTP/1.1 422 Unprocessable Entity
 *     Content-Type: application/json
 *
 *     {
 *       "message": "User validation failed",
 *       "errors": {
 *         "username": {
 *           "kind": "minlength",
 *           "message": "Path `username` (`0`) is shorter than the minimum allowed length (3).",
 *           "name": "ValidatorError",
 *           "path": "username",
 *           "properties": {
 *             "message": "Path `{PATH}` (`{VALUE}`) is shorter than the minimum allowed length (3).",
 *             "minlength": 3,
 *             "path": "username",
 *             "type": "minlength",
 *             "value": "0"
 *           },
 *           "value": "0"
 *         }
 *       }
 *     }
 */

module.exports = router;
