/**
 * Return list of movies based on query
 */
exports.query = function(req, res) {

	var query = trim(req.params.query).replace(/\+/g, ' ');

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

	query = trim(query);

	var options = merge({
		'query': query,
		'limit': req.query.limit || 5,
		'autocomplete': ['true', '1'].indexOf((req.query.autocomplete || '').toLowerCase()) != -1
	}, year ? {'year': year} : {});

	api.searchMovie(options, function(results){

		res.type('application/json');
		res.json(results);

	});

};