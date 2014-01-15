var cheerio = require('cheerio'),
	settings = global.settings.veta,
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);

exports.eta = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(0, 2) != 'tt'){
		callback();
		return;
	}

	var veta_hash = 'veta:'+imdb;

	var get_details = function(detail_url){

		api.request({
			'timeout': settings.timeout || 3000,
			'url': detail_url
		}, function(err, response, body){

			// Log errors
			if(err){
				log.error(err);
				callback(null, {});
				return;
			}

			var $ = cheerio.load(body),
				raw_dates = {};

			$('#content-wrapper .release-dates tr').each(function(nr, row){
				$(['theatrical', 'dvd', 'blu-ray']).each(function(nr, klass){
					if(row.attribs['class'] == klass){
						var value = $(row).find('.value').text();
						raw_dates[klass] = strtotime(value);

						if(value.toLowerCase().indexOf('yes') > -1)
							raw_dates[klass] = true;
					}
				});
			});

			var dates = {
				'theater': raw_dates.theatrical || 0,
				'dvd': raw_dates.dvd || 0,
				'bluray': raw_dates['blu-ray'] && (raw_dates['blu-ray'] > 0 || raw_dates['blu-ray'] == true)
			};

			callback(null, dates);

		});
	};

	rclient.get(veta_hash, function(err, detail_url){

		// Exists, just get the results
		if(detail_url){
			get_details(detail_url);
		}
		// Search for the url
		else {

			api.getMovieInfo(imdb, function(movie_info){

				if(!movie_info){
					callback();
					return;
				}

				var search_url = 'https://www.google.nl/search?q="'+encodeURIComponent(movie_info.original_title)+'"+%28'+movie_info.year+'%29+site%3Ahttp%3A%2F%2Fvideoeta.com%2Fmovie%2F+-old.videoeta.com+-beta.videoeta.com';

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

					var match = (body || '').match(/videoeta.com\/movie\/(\d+)/),
						no_results = (body || '').toLowerCase().match(/yellow.alert/),
						detail_url;

					if(!no_results && match && match.length > 0 && match[1])
						detail_url = settings.url + '/movie/'+match[1]+'/'+((movie_info.original_title || 'a').replace(/\W/g, '-').toLowerCase())+'/';

					if(detail_url){
						get_details(detail_url);

						// Cache
						rclient.set(veta_hash, detail_url);
					}
					else {
						callback();
					}
				});

			});


		}

	})

}
