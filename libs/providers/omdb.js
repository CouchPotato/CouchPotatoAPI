var settings = global.settings.moviedb,
	log = global.createLogger(__filename);

exports.info = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(0, 2) != 'tt'){
		callback();
		return;
	}

	api.request({
		'timeout': settings.timout || 3000,
		'url': 'http://www.omdbapi.com/?i=' + imdb,
		'json': true
	}, function(err, response, movie) {

		// Log errors
		if(err || movie.Response && movie.Response == 'False'){
			callback(null, {});
			return;
		}

		for (var key in movie) {
			if(movie[key].toLowerCase() == 'n/a')
				delete movie[key];
		};

		var cleanupList = function(list_string){
			if(!list_string) return [];
			return (list_string || '').replace(/,\s/g, ',').split(',');
		}

		var runtimeToMinutes = function(runtime_str){
			runtime = 0;

			if(!runtime_str)
				return null;

			var matches = runtime_str.match(/(\d*.?\d+).(h|hr|hrs|mins|min)+/g);
			matches.forEach(function(match){
				var splt = match.replace(/^\s+|\s+$/g, '').split(' ');
				runtime += parseInt(splt[0]) * (splt[1] == 'h' ? 60 : 1)
			});

			return runtime
		}

		var movie_data = {
			'via_imdb': true,
			'titles': movie.Title ? [movie.Title] : [],
			'original_title': movie.Title,
			'year': movie.Year ? parseInt(movie.Year) : null,
			'images': {
				'poster': (movie.Poster && movie.Poster.length > 4) ? [movie.Poster] : [],
			},
			'rating': {
				'imdb': [parseFloat(movie.imdbRating || 0), parseInt((movie.imdbVotes || '0').replace(',', ''))],
			},
			'plot': movie.Plot,
			'imdb': movie.imdbID,
			'genres': cleanupList(movie.Genre),
			'directors': cleanupList(movie.Director),
			'writers': cleanupList(movie.Writer),
			'actors': cleanupList(movie.Actors),
		}

		if(runtime = runtimeToMinutes(movie.Runtime))
			movie_data['runtime'] = runtime;

		// Return
		callback(null, movie_data);

	});

}
