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

			$('.panel.panel-info').each(function(nr, row) {
				var row = $(row),
					it = $('.panel-title', row),
					header_text = it.text().toLowerCase(),
					bluray = header_text.indexOf('blu-ray') > -1;

				//p(row);

				if (header_text.indexOf('theater') > -1) {
					dates['theater'] = strtotime($('.pull-right', it).text());
				}
				else if (header_text.indexOf('dvd') > -1 || bluray) {
					dates['dvd'] = strtotime($('.pull-right', it).text());
					dates['bluray'] = bluray;
				}

			});

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

				var search_url = 'http://www.google.com/cse?cx=partner-pub-9136844266644239%3A4586776767&sa=Search&num=1&nojs=1&q="'+encodeURIComponent(movie_info.original_title)+'"+%28'+movie_info.year+'%29';

				api.request({
					'timeout': settings.timeout || 3000,
					'url': search_url
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