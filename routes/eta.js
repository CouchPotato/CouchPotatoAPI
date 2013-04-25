var request = require('request'),
	redis = require('redis'),
	async = require('async'),
	providers = require('../libs/providers')
    rclient = redis.createClient();

exports.imdb = function(req, res) {

	var imdb = 'tt'+req.params.imdb;

	global.api.getMovieEta(imdb, function(result){

		res.type('application/json');
		res.json(result);

	});

};
