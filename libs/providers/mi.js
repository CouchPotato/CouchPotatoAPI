var cheerio = require('cheerio'),
	settings = global.settings.mi;

exports.eta = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(2) != 'tt'){
		callback();
		return;
	}

	var mi_hash = 'mi.'+imdb;

	var get_details = function(detail_url){

		global.api.request({
			'timeout': settings.timeout || 3000,
			'url': detail_url
		}, function(error, response, body){
			var $ = cheerio.load(body),
				dates = {};

			$('#profileData tr th').each(function(nr, row){
				var row = $(row),
					it = row.text().toLowerCase();

				$(['theater', 'dvd']).each(function(nr, key){
					if(it.indexOf(key) > -1){
						var str = $($('a', row.next())[0]).attr('href'),
							split = str.substr(0, str.length-1).split('/');
							dates[key] = global.strtotime(split[split.length-1] + '-' + split[split.length-3] + '-' + split[split.length-2])
					}
				});

				dates['bluray'] = (it.indexOf('blu-ray') > -1);

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

			global.api.getMovieInfo(imdb, function(movie_info){

				var search_url = 'http://www.google.com/cse?cx=partner-pub-9136844266644239%3A4586776767&sa=Search&num=1&nojs=1&q='+encodeURIComponent(movie_info.original_title)+'+%28'+movie_info.year+'%29';

				global.api.request({
					'timeout': settings.timeout || 3000,
					'url': search_url
				}, function(error, response, body){

					var match = body.match(/movieinsider.com\/m(\d+)\/.*\//);
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