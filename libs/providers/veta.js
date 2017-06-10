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

				var search_url = global.settings.mdb.proxy_url + encodeURIComponent('https://www.google.com/search?q="'+movie_info.original_title+'"+%28'+movie_info.year+'%29+site%3A'+encodeURIComponent(settings.url)+'%2Fmovie%2F');

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

					var match = (body || '').match(/.com\/movie\/(\d+)/),
						no_results = (body || '').toLowerCase().match(/id=\"no_results\"/),
						detail_url;

					if(!no_results && match && match.length > 0 && match[1])
						detail_url = settings.url + '/movie/'+match[1]+'/'+((movie_info.original_title || 'a').replace(/\W/g, '-').toLowerCase())+'/';

					if(detail_url){
						get_details(detail_url);

						// Cache
						rclient.setex(veta_hash, 1209600, detail_url);
					}
					else {
						callback();
					}
				});

			});


		}

	})

}
