var redis = require('redis'),
    rclient = redis.createClient();

exports.query = function(req, res) {

	var query = global.trim(req.params.query).replace('+', ' ');

	// Get year
	if(query.length > 6){
		var correct = function(y){
			return y.length == 4 && y > 1900;
		}, year;

		// Try "name year"
		year = query.substr(-4);
		if(correct(year)){
			query = query.substr(0, (query.length-4));
		}
		else {
			// Try "name (year)"
			year = query.substr(-5, 4);
			if(query.substr(-1) == ')' && query.substr(-6, 1) == '(' && correct(year))
				query = query.substr(0, (query.length-6));
			else
				year = null;
		}
	}

	query = global.trim(query);

	var options = global.merge({
		'query': query,
		'limit': 5
	}, year ? {'year': year} : {});

	global.api.searchMovie(options, function(results){

		res.type('application/json');
		res.json(results);

	});

};