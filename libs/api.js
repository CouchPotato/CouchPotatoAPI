var async = require('async'),
	request = require('request'),
	providers = require('./providers'),
	toIMDB = require('./providers/tmdb').toIMDB,
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);

// Some logging around request
exports.request = function(options, callback){
	if(settings.ENV == 'development')
		log.info('Opening url:' + (options instanceof Object ? options.url : options));

	return request(options, callback);
}

exports.isMovie = function(imdb, callback){

	var hash = 'ismovie:' + imdb;

	// Get from Redis
	rclient.get(hash, function(err, result){

		// Log errors
		if(err){
			log.error(err);
			callback({});
			return;
		}

		// Return if exists
		if(result){
			callback(JSON.parse(result));
		}
		// Go through provider
		else {

			var is_movie = false;
			async.parallel(providers.ismovie(imdb), function(err, results) {

				// Log errors
				if(err){
					log.error(err);
					callback({});
					return;
				}

				var total = 0;
				results.forEach(function(result){
					total += +(result)
				});

				is_movie = (total > 0)

				// Cache
				rclient.set(hash, JSON.stringify(is_movie));

				// Send back
				callback(is_movie);

			});

		}

	});

}

exports.getMovieInfo = function(id, callback){

	var hash = 'info:' + id;

	// Get from Redis
	rclient.get(hash, function(err, result){

		// Log errors
		if(err){
			log.error(err);
			callback({});
			return;
		}

		// Return if exists
		if(result){
			callback(JSON.parse(result));
		}
		// Go through all providers and save data
		else {

			async.waterfall([
				function(next_callback){
					if((id + '').substring(0, 2) != 'tt'){

						toIMDB(id, function(result){
							if(result)
								next_callback(null, result);
							else
								next_callback(null, id);
						});

					}
					else {
						next_callback(null, id);
					}

				},
				function(imdb_id, next_callback){

					async.parallel(providers.info(imdb_id || id), function(err, results) {

						// Log errors
						if(err){
							log.error(err);
							next_callback(null, {});
							return;
						}

						var movie_info = {};
						results.forEach(function(result){
							movie_info = merge(movie_info, result);
						});

						next_callback(null, movie_info);

					});

				}
			], function(err, movie_info){

				// Cache
				rclient.setex(hash, 86400, JSON.stringify(movie_info));

				// Send back
				callback(movie_info);

			});

		}

	});

}

exports.searchMovie = function(options, callback){

	options.limit = options.limit || 3;
	options.autocomplete = options.autocomplete || false

	var hash = 'search:' + options.query + '.' + (options.year || '') + '.' + options.limit + '.' + (options.autocomplete ? 'ac' : 'f');

	// Get from Redis
	rclient.get(hash, function(err, result){

		// Log errors
		if(err){
			log.error(err);
			callback({});
			return;
		}

		// Return if exists
		if(result){
			callback(JSON.parse(result));
		}
		// Go through all providers and save data
		else {

			async.parallel(providers.search(options), function(err, all_results) {

				// Log errors
				if(err){
					log.error(err);
					callback([]);
					return;
				}

				// Merge results on imdb if possible
				var new_results = [],
					ids = [];

				all_results.forEach(function(provider_results, nr){

					provider_results.forEach(function(result, nr){

						if(result.imdb){
							var current_pos = ids.indexOf(result.imdb);

							// First one
							if(current_pos == -1){
								new_results.push(result);
								ids.push(result.imdb);
							}
							else {
								new_results[current_pos] = merge(new_results[current_pos], result);
							}

						}
						else {
							new_results.push(result);
							ids.push(result.tmdb_id || result.id || '');
						}

					});

				});

				// Cache
				rclient.setex(hash, 86400, JSON.stringify(new_results));

				// Send back
				callback(new_results);

			});

		}

	});

}

exports.getMovieEta = function(id, callback){

	var hash = 'eta:' + id,
		now = Math.round(new Date().getTime() / 1000);

	// Get from Redis
	rclient.get(hash, function(err, result){

		// Log errors
		if(err){
			log.error(err);
			callback({});
			return;
		}

		// Return if exists
		if(result){
			callback(JSON.parse(result));
		}
		// Go through all providers and save data
		else {

			async.parallel(providers.eta(id), function(err, results) {

				// Log errors
				if(err){
					log.error(err);
					callback({});
					return;
				}

				var release_dates = {
					'dvd': 0,
					'theater': 0,
					'bluray': false,
					'expires': now+(86400*3)
				}

				// Combine dates
				results.forEach(function(dates){

					if(!dates) return;

					// Pick lowest date
					['dvd', 'theater', 'expires'].forEach(function(key){
						if(!release_dates[key] || (dates[key] && dates[key] < release_dates[key]))
							release_dates[key] = dates[key] ? dates[key] : 0;
					});

					// Overwrite bluray
					release_dates['bluray'] = dates.bluray && !release_dates.bluray ? dates.bluray : release_dates.bluray

				});

				// Set far future expire date on old movies
				if((release_dates.dvd && release_dates.dvd < (now-(604800*2)) && release_dates.theater && release_dates.theater < now)
					|| release_dates.theater < (now-(31449600*4))
				)
					release_dates['expires'] = now+(604800*52);

				// Force expire if not exists, 3 days
				if(!release_dates.expires)
					release_dates['expires'] = now+259200;

				// Cache
				rclient.setex(hash, release_dates.expires - now, JSON.stringify(release_dates));

				// Send results back
				callback(release_dates);

			});
		}
	})

}
