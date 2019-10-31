var express = require('express');
var router = express.Router();
const Poi = require('../models/poi');
/* agrégation à faire */
router.get('/', function(req, res, next) {

// const countQuery = queryPoi(req);
  /* countQuery.count(function(err, total) {
    if (err) {
      return next(err);
    }
    */

    // Parse pagination parameters from URL query parameters.
    // const { page, pageSize } = pois.getPaginationParameters(req);

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
        $unwind: '$ratingPoi'
      },
      {
      	// regrouper 
        $group: {
          _id: '$_id',
          postedBy: '$postedBy',
          pos: '$pos',
          photos: '$photos',
          title: '$title',
          description: '$description',
          dateAdd: '$dateAdd',
          categorie: '$categorie',
          averageRating: { $avg: "$ratingPoi.value" }
        }
      },
      {
        $sort: {
          averageRating: 1
        }
      }
      ],
      (err, poiSort) => {
      if (err) {
        return next(err);
      }

res.send(poiSort.map(poi => {

        // Transform the aggregated object into a Mongoose model.
        const serialized = new Poi(poi).toJSON();

        // Add the aggregated property.
        serialized.ratingPoi = poi.ratingPoi;

        return serialized;
      }));


      });
      /*m{
        $skip: (page - 1) * pageSize
      },
      {
        $limit: pageSize
      }
    ], (err, people) => {
      if (err) {
        return next(err);
      } */

      // pois.addLinkHeader('/pois', page, pageSize, total, res);

});

router.post('/', function(req, res, next) {

	new Poi(req.body).save(function(err, savedPoi) {
    if (err) {
      return next(err);
    }

    res
      .status(201)
      .set('Location', `http://localhost:3000/pois/${savedPoi._id}`)
      .send(savedPoi);
  });
	

});

router.get('/:id', function(req, res, next) {

});

router.put('/:id', function(req, res, next) {

});

router.patch('/:id', function(req, res, next) {

});

router.delete('/:id', function(req, res, next) {

});

module.exports = router;