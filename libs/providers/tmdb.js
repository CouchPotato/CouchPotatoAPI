var settings = global.settings.moviedb,
	redis = require('redis'),
	rclient = redis.createClient(),
	moviedb = require('moviedb')(settings.apikey),
	async = require('async'),
	log = global.createLogger(__filename);

// TMDB image base url
var config = null,
	img_url = 'https://d3gtl9l2a4fn1j.cloudfront.net/t/p/';

moviedb.configuration(function(error, c){
	config = c;

	try {
		img_url = c.images.secure_base_url;
	}
	catch(e){};
});

exports.info = function(id, callback){

	// Go do a search
	moviedb.movieInfo({'id': id}, function(err, r){

		// Log errors
		if(!r || err){
			if(!(err + '').indexOf('not found'))
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
			'titles': [],
			'original_title': r.original_title,
			'year': parseInt(r.release_date.substr(0, 4)),
			'images': {
				'poster': r.poster_path ? [img_url + 'w154' + r.poster_path] : [],
				'backdrop': r.backdrop_path ? [img_url + 'w1280' + r.backdrop_path] : [],
				'poster_original': r.poster_path ? [img_url + 'original' + r.poster_path] : [],
				'backdrop_original': r.backdrop_path ? [img_url + 'original' + r.backdrop_path] : [],
				'actors': {}
			},
			'runtime': r.runtime,
			'plot': r.overview,
			'tagline': r.tagline,
			'imdb': r.imdb_id,
			'genres': genres,
			'actor_roles': {}
		}

		var titles = [r.title, r.original_title];
		titles.forEach(function(title){
			if(title && movie_data.titles.indexOf(title) === -1)
				movie_data.titles.push(title);
		});

		// Cache TMDB -> IMDB id
		if(r.imdb_id)
			rclient.set('translate_tmdb:' + r.id, r.imdb_id);


		async.parallel([
			function(cb){

				// Get alternative titles
				moviedb.movieAlternativeTitles({'id': id}, function(err, alt){

					if(!err && alt && alt.titles && alt.titles.length > 0)
						alt.titles.forEach(function(title, nr){
							if(movie_data.titles.indexOf(title.title) === -1)
								movie_data.titles.push(title.title)
						});

					cb();

				});

			},
			function(cb){

				// Get cast members + images
				moviedb.movieCasts({'id': id}, function(err, casts){

					if(!err && casts && casts.cast && casts.cast.length > 0)
						casts.cast.forEach(function(member, nr){
							if(member.character && member.character.length > 0){

								movie_data.actor_roles[member.name] = member.character;

								if(member.profile_path && member.profile_path.length > 0)
									movie_data.images.actors[member.name] = img_url + 'w185' + member.profile_path;
							}
						});

					cb();

				});

			}
		], function(err, results){

			// Return
			callback(null, movie_data);

		});

	});

}

exports.search = function(options, callback){

	options = merge(options, {
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
		if(!rs.results || rs.results.length == 0 || (rs.results.length > 0 && !rs.results[nr])){
			callback(null, results);
			return;
		}

		var parse_next_result = function(info, force_add){
			nr++;

			if(force_add || info.imdb)
				results.push(info);

			// Return and search only first 3 with imdb_id
			if(results.length >= options.limit || rs.results.length <= nr || !rs.results[nr])
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

exports.toIMDB = function(id, callback){

	var hash = 'translate_tmdb:' + id;

	rclient.get(hash, function(err, result){

		// Log errors
		if(err){
			log.error(err);
			callback(null);
			return;
		}

		if(result){
			callback(result);
		}
		else {

			// Go do a search
			moviedb.movieInfo({'id': id}, function(err, r){

				// Log errors
				if(!r || err){
					if(!(err + '').indexOf('not found'))
						log.error(err);
					callback(null);
					return;
				}

				// Return
				callback(r.imdb_id);

				// Cache
				if(r.imdb_id)
					rclient.set(hash, r.imdb_id);

			});

		}

	})

}
