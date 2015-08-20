var settings = global.settings.moviedb,
	redis = require('redis'),
	rclient = redis.createClient(),
	async = require('async'),
	querystring = require('querystring'),
	log = global.createLogger(__filename);

// TMDB image base url
var config = null,
	img_url = 'https://image.tmdb.org/t/p/';

var request = function(call, params, callback){
	var localAddress = settings.localAddress ? settings.localAddress[Math.floor(Math.random() * settings.localAddress.length)] : null;

	params['api_key'] = settings.apikey;
	api.request({
		'url': 'https://api.themoviedb.org/3/'+call+'?'+querystring.stringify(params),
		'json': true,
		'localAddress': localAddress
	}, callback);

};

// Get image base
setTimeout(function(){
	request('configuration', {}, function(error, res, c){
		config = c;

		try {
			img_url = c.images.secure_base_url;
		}
		catch(e){};
	});
}, 0);

exports.info = function(id, callback){

	// Go do a search
	request('movie/' + id, {
		'append_to_response': 'alternative_titles,casts'
	}, function(err, res, r){

		// Log errors
		if(!r || err){
			if(!(err + '').indexOf('not found'))
				log.error(err, 'info: ' + id);
			callback(null, {});
			return;
		}

		// Get genres
		var genres = [];
		if(r.genres && r.genres.length > 0) {
			r.genres.forEach(function (genre) {
				genres.push(genre.name);
			});
		}

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
		};

		var titles = [r.title, r.original_title];
		titles.forEach(function(title){
			if(title && movie_data.titles.indexOf(title) === -1)
				movie_data.titles.push(title);
		});

		// Cache TMDB -> IMDB id
		if(r.imdb_id)
			rclient.set('translate_tmdb:' + r.id, r.imdb_id);

		// Get alternative titles
		if(r.alternative_titles && r.alternative_titles.titles && r.alternative_titles.titles.length > 0){
			r.alternative_titles.titles.forEach(function(title){
				if(movie_data.titles.indexOf(title.title) === -1)
					movie_data.titles.push(title.title)
			});
		}

		if(r.casts && r.casts.cast && r.casts.cast.length > 0){
			r.casts.cast.forEach(function(member){
				if(member.character && member.character.length > 0){

					movie_data.actor_roles[member.name] = member.character;

					if(member.profile_path && member.profile_path.length > 0)
						movie_data.images.actors[member.name] = img_url + 'w185' + member.profile_path;
				}
			});
		}

		callback(null, movie_data);

	});

}

exports.search = function(options, callback){

	options = merge(options, {
		'search_type': 'ngram'
	})

	request('search/movie', options, function(err, res, rs){

		// Log errors
		if(err){
			log.error(err, 'searchMovie: ' + options.query);
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
			request('movie/'+ id, {}, function(err, res, r){

				// Log errors
				if(!r || err){
					if(!(err + '').indexOf('not found'))
						log.error(err, 'toIMDB: ' + id);
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
