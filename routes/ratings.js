var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Rate = require('../models/rating');
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

// GET /api/ratings
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

// GET /api/ratings/:id
router.get('/:id', loadRateFromParams, function(req, res, next) {
  res.send(req.rate);
 });

// POST api/ratings
router.post('/:id', authenticate, loadUserFromParams, function(req, res, next) {

  new Rate(req.body).save(function(err, savedRate) {
    if (err) {
      return next(err);
    }

    res
      .status(201)
      // Rajouter le ${config.baseUrl} //
      .set('Location', `/ratings/${savedRate._id}`)
      .send(savedRate);
    });
  });

/* Routes en PATCH */

// Modifier un commentaire
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

/* Routes en DELETE */

// Supprimer un rating
router.delete('/:id', authenticate, loadRateFromParams, function(req, res, next) {

  // Contrôle des autorisations : l'utilisateur doit avoir créer le rating pour le modifier //
  if (req.currentUserId !== req.rate.postedBy.toString()){
    return res.status(403).send('Vous devez avoir créé ce rating pour le supprimer.')
  }
  
  req.rate.remove(function(err) {
    if (err) { return next(err); }
    res.sendStatus(204);
  });
});

module.exports = router;

// tous les ratings qu'un utilisateur a posté
// tous les ratings appartenant à un poi