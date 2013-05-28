var async = require('async'),
	request = require('request'),
	providers = require('./providers'),
	redis = require('redis'),
    rclient = redis.createClient(),
	log = global.createLogger(__filename);

// Some logging around request
exports.request = function(options, callback){
	if(global.settings.ENV == 'development')
		console.log('Opening url:' + (options instanceof Object ? options.url : options));

	return request(options, callback);
}

exports.isMovie = function(imdb, callback){

	var hash = 'ismovie:tt' + imdb;

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

			async.parallel(providers.info(id), function(err, results) {

				// Log errors
				if(err){
					log.error(err);
					callback({});
					return;
				}

				var movie_info = {};
				results.forEach(function(result){
					movie_info = global.merge(movie_info, result);
				});

				// Cache
				rclient.setex(hash, 3600, JSON.stringify(movie_info));

				// Send back
				callback(movie_info);

			});

		}

	});

}

exports.searchMovie = function(options, callback){

	options.limit = options.limit || 3;
	options.autocomplete = options.autocomplete || false

	var hash = 'search:' + options.query + '.' + options.limit + '.' + (options.autocomplete ? 'ac' : 'f');

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
								new_results[current_pos] = global.merge(new_results[current_pos], result);
							}

						}
						else {
							new_results.push(result);
							ids.push(result.tmdb_id || result.id || '');
						}

					});

				});

				// Cache
				rclient.setex(hash, 3600, JSON.stringify(new_results));

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
							release_dates[key] = dates[key];
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
