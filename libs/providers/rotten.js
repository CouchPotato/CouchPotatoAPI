var cheerio = require('cheerio'),
	settings = global.settings.rotten;

var url = 'http://api.rottentomatoes.com/api/public/v1.0/';

exports.eta = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(2) != 'tt'){
		callback();
		return;
	}

	var now = Math.round(new Date().getTime() / 1000);

	global.api.request({
		'timeout': settings.timout || 3000,
		'url': url + 'movie_alias.json?type=imdb&id=' + imdb.replace('tt', '') + '&apikey=' + settings.apikey
	}, function(error, response, body){

		var rotten = JSON.parse(body)
			dates = rotten.release_dates;

		callback(null, dates ? {
			'dvd': dates.dvd ? global.strtotime(dates.dvd) : 0,
			'theater': dates.theater ? global.strtotime(dates.theater) : 0,
			'bluray': dates.dvd ? (global.strtotime(dates.dvd) > 0 && rotten.year > 2005) : false,
			'expires': now+(604800*2)
		} : null);

	});

}