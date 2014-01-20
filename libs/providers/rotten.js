var cheerio = require('cheerio'),
	settings = global.settings.rotten,
	log = global.createLogger(__filename);

var url = 'http://api.rottentomatoes.com/api/public/v1.0/';

exports.eta = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(0, 2) != 'tt'){
		callback();
		return;
	}

	var now = Math.round(new Date().getTime() / 1000);

	api.request({
		'timeout': settings.timout || 3000,
		'url': url + 'movie_alias.json?type=imdb&id=' + imdb.replace('tt', '') + '&apikey=' + settings.apikey
	}, function(err, response, body){

		// Log errors
		if(err){
			log.error(err);
			callback(null, {});
			return;
		}

		try {
			var rotten = JSON.parse(trim(body)),
				dates = rotten.release_dates;
	
			callback(null, dates ? {
				'dvd': dates.dvd ? strtotime(dates.dvd) : 0,
				'theater': dates.theater ? strtotime(dates.theater) : 0,
				'bluray': dates.dvd ? (strtotime(dates.dvd) > 0 && rotten.year > 2005) : false,
				'expires': now+(604800*2)
			} : null);
		}
		catch(err){
			log.error(err);
			callback(null, {});
		}

	});

}