var express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
var router = express.Router();
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
      return res.status(401).send('Votre token est invalide ou a expiré.');
    } else {
      req.currentUserId = payload.sub;
      // Passe l'ID de l'utilisateur authentifié au prochain middleware
      next(); 
    }
  });
}

/* Routes en GET */

// Listing de tous les utilisateurs de l'application //
router.get('/', function(req, res, next) {

  User.find().sort('username').exec(function(err, users) {
    if (err) {
      return next(err);
    }
    res.send(users);
  });
});

// Affichage d'un utilisateur spécifique //
router.get('/:id', loadUserFromParams, function(req, res, next) {
 res.send(req.user);
});

/* Routes en POST */

// Créer un utilisateur //
router.post('/', function(req, res, next) {

	// Config bcrypt
	const plainPassword = req.body.password;
  	const saltRounds = 10;

  	// Hachage
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

		    res.status(201)
		      	// Rajouter le ${config.baseUrl} //
		      	.set('Location', `/users/${savedUser._id}`)
		      	.send(savedUser);
	  	});
	});
});

// Route pour l'authentifier 
router.post('/login', function(req, res, next) {

	// Trouve l'utilisateur par son pseudo
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
	      // Si le login est validé
	      //res.send(`Welcome ${user.username}!`);

		  // Genère le JWT (JsonWebToken), ici pour une durée de 7 jours
	      const exp = (new Date().getTime() + 7 * 24 * 3600 * 1000) / 1000;
	      const claims = { sub: user._id.toString(), exp: exp };

	      jwt.sign(claims, secretKey, function(err, token){
		        if (err) { return next(err); }
			        // Envoi du token au client 
			        //res.send(`token : ${token} !`);
			        res.send({ token: token });
		    });
	    });
  	})
});

/* Routes en PUT */

// Modifier un utilisateur (Authentification & ne peut que se modifier lui-même)//
router.put('/:id', authenticate, loadUserFromParams, function(req, res, next){

	//const currentUserId = req.currentUserId;

	// Contrôle des autorisations : l'utilisateur ne peut que modifier ses informations propres
    if (req.currentUserId !== req.user._id.toString()){
      return res.status(403).send('Vous n\'avez pas le droit de modification(PUT) sur cette ressource.')
    }

	req.user.username = req.body.username;
	req.user.email = req.body.email;
	req.user.password = req.body.password;
	req.user.imgProfil = req.body.imgProfil;

	req.user.save(function(err, updatedUser){
	if (err) {
		      return next(err);
		    }
		    res.send(updatedUser);
  	});
});

/* Routes en PATCH */

// Modifier partiellement un utilisateur (Authentification & ne peut que se modifier lui-même)//

router.patch('/:id', authenticate, loadUserFromParams, function(req, res, next) {

	// Contrôle des autorisations : l'utilisateur ne peut que modifier ses informations propres.
    if (req.currentUserId !== req.user._id.toString()){
      return res.status(403).send('Vous n\'avez pas le droit de modification partielle (PATCH) sur cette ressource.')
    }
	
	//Mets à jour l'utilisateur en fonction des params présents ou non dans req.body 
	  if (req.body.username !== undefined) {
	    req.user.username = req.body.username;
	  }
	  if (req.body.email !== undefined) {
	   	req.user.email = req.body.email;
	  }
	  if (req.body.password !== undefined) {
	    req.user.password = req.body.password;
	  }
	  if (req.body.imgProfil !== undefined) {
	    req.user.imgProfil = req.body.imgProfil;
	  }

  req.user.save(function(err, modifiedPerson) {
    if (err) {
      return next(err);
    }
    res.send(modifiedPerson);
  });
});

/* Routes en DELETE */

// Supprimer un utilisateur (Authentification & ne peut que se supprimer lui-même)//
router.delete('/:id', authenticate, loadUserFromParams, function(req, res, next) {

	// Contrôle des autorisations : l'utilisateur ne peut que se modifier lui-même
    if (req.currentUserId !== req.user._id.toString()){
      return res.status(403).send('Vous n\'avez pas le droit de suppression (DELETE) sur cette ressource.')
    }

  	req.user.remove(function(err) {
    if (err) { return next(err); }
    	res.sendStatus(204);
  });
});

module.exports = router;
