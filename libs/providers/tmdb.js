var settings = global.settings.moviedb,
	moviedb = require('moviedb')(settings.apikey),
	log = global.createLogger(__filename);

// TMDB image base url
var img_url = 'http://cf2.imgobject.com/t/p/';

exports.info = function(id, callback){

	// Go do a search
	moviedb.movieInfo({'id': id}, function(err, r){

		// Log errors
		if(err){
			log.error(err);
			callback(null, {});
			return;
		}

		// Get genres
		var genres = [];
		r.genres.forEach(function(genre){
			genres.push(genre.name);
		});

		var movie_data = {
			'via_tmdb': true,
			'tmdb_id': r.id,
			'titles': [r.title],
			'original_title': r.original_title,
			'year': parseInt(r.release_date.substr(0, 4)),
			'images': {
				'poster': r.poster_path ? [img_url + 'w154' + r.poster_path] : [],
				'backdrop': r.backdrop_path ? [img_url + 'w1280' + r.backdrop_path] : [],
				'poster_original': r.poster_path ? [img_url + 'original' + r.poster_path] : [],
				'backdrop_original': r.backdrop_path ? [img_url + 'original' + r.backdrop_path] : [],
			},
			'runtime': r.runtime,
			'plot': r.overview,
			'tagline': r.tagline,
			'imdb': r.imdb_id,
			'genres': genres
		}

		// Return
		callback(null, movie_data);

	});

}

exports.search = function(options, callback){

	options = global.merge(options, {
		'search_type': 'ngram'
	})

	moviedb.searchMovie(options, function(err, rs){

		// Log errors
		if(err){
			log.error(err);
			callback(null, []);
			return;
		}

		var nr = 0,
			results = [];

		// Return empty results
		if(rs.results.length == 0){
			callback(null, results);
			return;
		}

		var parse_next_result = function(info, force_add){
			nr++;

			if(force_add || info.imdb)
				results.push(info);

			// Return and search only first 3 with imdb_id
			if(results.length >= options.limit || rs.results.length <= nr)
				callback(null, results);
			else {

				// Next result
				var r = rs.results[nr];
				if(!options.autocomplete)
					api.getMovieInfo(r.id, parse_next_result);
				else
					parse_next_result(r, true);

			}

		}

		if(!options.autocomplete)
			api.getMovieInfo(rs.results[nr].id, parse_next_result);
		else
			parse_next_result(rs.results[nr], true);

	});

}
