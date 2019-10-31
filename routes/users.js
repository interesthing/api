var express = require('express');
var router = express.Router();
const User = require('../models/user');

/* Routes en GET */

// Listing des utilisateurs de l'application //
router.get('/users', function(req, res, next) {
  User.find().sort('username').exec(function(err, users) {
    if (err) {
      return next(err);
    }
    res.send(users);
  });
});

// Affichage d'un utilisateur spécifique //
router.get('/users/:id', function(req, res, next) {
  User.find('username').exec(function(err, users) {
    if (err) {
      return next(err);
    }
    res.send(users);
  });
});

/* Routes en POST */

// Créer un utilisateur //
router.post('/users', function(req, res, next) {
	// TODO ajouter un utilisateur //
});

/* Routes en PUT */

// Remplacer un utilisateur //
router.put('/users/:id', function(req, res, next) {
	// TODO modifier un utilisateur //
});

/* Routes en PATCH */

// Modifier partiellement un utilisateur //
router.patch('/users/:id', function(req, res, next) {
	// TODO modifier partiellement un utilisateur //
});

/* Routes en DELETE */

// Supprimer un utilisateur //
router.patch('/users/:id', function(req, res, next) {
	// TODO supprimer un utilisateur //
});

module.exports = router;