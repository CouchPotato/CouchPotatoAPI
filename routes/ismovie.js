var request = require('request'),
	redis = require('redis'),
    rclient = redis.createClient();

exports.imdb = function(req, res) {

	var imdb = 'tt'+req.params.imdb;

	global.api.isMovie(imdb, function(result){

		res.type('application/json');
		res.json({
			'is_movie': result
		});

	});

};