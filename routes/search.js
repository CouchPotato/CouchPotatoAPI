var redis = require('redis'),
    rclient = redis.createClient();

exports.query = function(req, res) {

	var query = req.params.query;

	res.type('application/json');
	global.api.searchMovie({
		'query': query,
		'limit': 3
	}, function(results){

		res.json(results);

	});

};