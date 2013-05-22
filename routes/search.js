var redis = require('redis'),
    rclient = redis.createClient();

exports.query = function(req, res) {

	var query = req.params.query;

	if(query.length > 6){
		var spl = query.substr(),
			year = spl[spl.length-1];
		if(year.length == 4 && year > 1900){
			console.log('test');
			console.log(query);
		}
		else {
			year = null;
		}
	}

	res.type('application/json');
	res.json([]);
	return;

	global.api.searchMovie({
		'query': query,
		'year': year,
		'limit': 3
	}, function(results){

		res.type('application/json');
		res.json(results);

	});

};