var cheerio = require('cheerio'),
	settings = global.settings.mdb,
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);

exports.info = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(0, 2) != 'tt'){
		callback(null, {});
		return;
	}

	var hash_404 = 'mdb:'+imdb;

	rclient.get(hash_404, function(err, result){

		// Log errors
		if(err){
			log.error(err, 'hash_404 redis: ' + imdb);
		}

		// Don't check site when 404 hash is set
		if(result){
			callback(null, {});
		}
		else {

			api.request({
				'timeout': settings.timeout || 3000,
				'url': settings.proxy_url + encodeURIComponent(settings.info_url + imdb),
				'json': true
			}, function(err, response, movie) {

				// Log errors
				if(err || !movie.data){
					if(response && response.statusCode == 404){
						log.error('Not found for: ' + imdb + ' ignoring for 7 days');
						rclient.setex(hash_404, 604800, 1);
					}
					else {
						log.error(err, 'mdb info: ' + imdb);
					}
					callback(null, {});
					return;
				}

				var movie = movie.data;

				var movie_data = {
					'via_imdb': true,
					'titles': movie.title ? [movie.title] : [],
					'original_title': movie.title,
					'year': movie.year ? parseInt(movie.year) : null,
					'images': {
						'poster': (movie.image && movie.image.url) ? [movie.image.url] : []
					},
					'rating': {},
					'runtime': movie.runtime ? movie.runtime.time / 60 : null,
					'plot': movie.plot && movie.plot.outline ? movie.plot.outline : null,
					'imdb': movie.imdbID,
					'mpaa': movie.certificate ? movie.certificate.certificate : null,
					'genres': movie.genres
				}

				if(movie.rating && movie.num_votes)
					movie_data['rating']['imdb'] = {0:movie.rating, 1:movie.num_votes}

				// Return
				callback(null, movie_data);

			});

		}

	});

}

exports.eta = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(0, 2) != 'tt'){
		callback(null, {});
		return;
	}

	api.request({
		'timeout': settings.timeout || 3000,
		'url': settings.eta_url + imdb + '/releaseinfo'
	}, function(err, response, body) {

		// Log errors
		if(err){
			log.error(err, 'mdb eta: ' + imdb);
			callback(null, {});
			return;
		}

		var $ = cheerio.load(body);

		// Get all the dates and parse them
		var imdb_time = null;
		$('#tn15content > table td[align=right]').each(function() {
			var new_time = strtotime($(this).text());
			if(!imdb_time || imdb_time > new_time)
			 	imdb_time = new_time;
		});

		if(imdb_time)
			callback(null, {'theater': imdb_time});
		else
			callback(null, {});

	});

}

exports.ismovie = function(imdb, callback){

	api.request({
		'timeout': settings.timeout || 3000,
		'url': settings.ismovie_url + imdb + '/'
	}, function(err, response, body) {

		// Log errors
		if(err){
			log.error(err, 'mdb ismovie: ' + imdb);
			callback(null, true);
			return;
		}

		callback(null, !(body.indexOf('content="video.tv_show"') > -1));

	});

}
