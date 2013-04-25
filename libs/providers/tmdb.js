var settings = global.settings.moviedb,
	moviedb = require('moviedb')(settings.apikey);

// TMDB image base url
var img_url = 'http://cf2.imgobject.com/t/p/';

exports.info = function(id, callback){

	// Go do a search
	moviedb.movieInfo({'id': id}, function(err, r){

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
			'genre': genres
		}

		// Return
		callback(null, movie_data);

	});

}

exports.search = function(options, callback){

	moviedb.searchMovie(options, function(err, rs){

		var nr = 0,
			results = [];

		var parse_next_result = function(info){
			nr++;

			if(info.imdb)
				results.push(info);

			// Return and search only first 3 with imdb_id
			if(results.length >= (options.limit || 3) || rs.results.length <= nr)
				callback(null, results);
			else {

				// Next result
				var r = rs.results[nr];
				api.getMovieInfo(r.id, parse_next_result);

			}

		}

		api.getMovieInfo(rs.results[nr].id, parse_next_result);

	});

}
