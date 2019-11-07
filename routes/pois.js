var express = require('express');
var router = express.Router();
const Poi = require('../models/poi');

function loadPoisFromParams(req, res, next) {
  Poi.findById(req.params.id).exec(function(err, poi) {
    if (err) {
      return next(err);
    } else if (!poi) {
      return res.status(404).send('No poi found with ID ' + req.params.id);
    }
    req.poi = poi;
    next();
  });
}

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

router.delete('/:id', loadPoisFromParams, function(req, res, next) {
    req.poi.remove(function(err) {
      if (err) {
        return next(err);
      }
     res.sendStatus(204);
      });
});

router.patch('/:id', loadPoisFromParams, function(req, res, next) {
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

router.put('/:id', loadPoisFromParams, function(req, res, next) {

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

module.exports = router;