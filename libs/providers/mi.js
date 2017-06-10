var cheerio = require('cheerio'),
	settings = global.settings.mi,
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);

exports.eta = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(0, 2) != 'tt'){
		callback();
		return;
	}

	var mi_hash = 'mi:'+imdb;

	var get_details = function(detail_url){

		api.request({
			'timeout': settings.timeout || 3000,
			'url': detail_url + 'm/releases/'
		}, function(err, response, body){

			// Log errors
			if(err){
				log.error(err);
				callback(null, {});
				return;
			}

			var $ = cheerio.load(body),
				dates = {};

			var current_type = null;
			var bluray = false;

			$('.profile-page > *').each(function(nr, row) {
				var row = $(row);

				if(row.text().toLowerCase().indexOf('dvd') > -1){
					current_type = 'dvd';
					if(!bluray){
						bluray = row.text().toLowerCase().indexOf('blu-ray');
					}
				}
				else if(row.text().toLowerCase().indexOf('theaters') > -1){
					current_type = 'theater';
				}

				var match = (row + '').match(/dvds\/(\w+)\/(\d+)\/(\d+)/);
				if(current_type && match){
					var date = match[2] + '-' + match[1] + '-' + match[3];

					if(date){
						dates[current_type] = strtotime(date);
					}
				}
			});

			if(bluray){
				dates['bluray'] = true;
			}

			callback(null, dates);

		});
	};

	rclient.get(mi_hash, function(err, detail_url){

		// Exists, just get the results
		if(detail_url){
			get_details(detail_url);
		}
		// Search for the url
		else {

			api.getMovieInfo(imdb, function(movie_info){

				var search_url = 'https://www.google.com/search?q="'+encodeURIComponent(movie_info.original_title)+'"+%28'+movie_info.year+'%29+site%3Ahttps%3A%2F%2Fmovieinsider.com%2F';

				api.request({
					'timeout': settings.timeout || 3000,
					'url': search_url,
					'headers': {
						'Referer': global.settings.mdb.proxy_url,
						'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:53.0) Gecko/20100101 Firefox/53.0',
						'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
					}
				}, function(err, response, body){

					// Log errors
					if(err){
						log.error(err);
						callback();
						return;
					}

					var match = (body || '').match(/movieinsider.com\/m(\d+)\/.*\//);
					if(match && match.length > 0 && match[1])
						detail_url = settings.url + '/m'+match[1]+'/';

					if(detail_url){
						get_details(detail_url);

						// Cache
						rclient.set(mi_hash, detail_url);
					}
					else {
						callback();
					}
				});

			});


		}

	})

}