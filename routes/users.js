var express = require('express');
var router = express.Router();
const User = require('../models/user');

//Middleware pour récupérer l'ID
function loadUserFromParams(req, res, next) {
  User.findById(req.params.id).exec(function(err, user) {
    if (err) {
      return next(err);
    } else if (!user) {
      return res.status(404).send('No user found with ID ' + req.params.id);
    }
    req.user = user;
    next();
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
  new User(req.body).save(function(err, savedUser) {
    if (err) {
      return next(err);
    }

    //debug(`Created person "${savedUser.name}"`);

    res
      .status(201)
      // Rajouter le ${config.baseUrl} //
      .set('Location', `/users/${savedUser._id}`)
      .send(savedUser);
  });
});

/* Routes en PUT */

// Remplacer un utilisateur //
router.put('/:id', loadUserFromParams, function(req, res, next) {
	req.user.username = req.body.username;
	req.user.email = req.body.email;
	req.user.password = req.body.password;
	req.user.imgProfil = req.body.imgProfil;

  req.user.save(function(err, updatedUser) {
    if (err) {
      return next(err);
    }

    /*debug(`Updated user "${updatedUser.username}"`);*/
    res.send(updatedUser);
  });
});

/* Routes en PATCH */

// Modifier partiellement un utilisateur //

router.patch('/:id', loadUserFromParams, function(req, res, next) {
  	req.user = req.body; 
  	/* Contient :
  	{"username": "abc",
    "email":     "abc",
    "password":  "abc",
    "imgProfil": "abc"}*/

  req.user.save(function(err, updatedUser) {
    if (err) { return next(err); }
    res.send(updateUser);
  });
});

/* Routes en DELETE */

// Supprimer un utilisateur //
router.delete('/:id', loadUserFromParams, function(req, res, next) {
  req.user.remove(function(err) {
    if (err) { return next(err); }
    res.sendStatus(204);
  });
});

module.exports = router;