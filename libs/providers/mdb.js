var cheerio = require('cheerio'),
	settings = global.settings.mdb,
	log = global.createLogger(__filename);

exports.eta = function(imdb, callback){

	// Only except imdb ids
	if((imdb + '').substring(0, 2) != 'tt'){
		callback();
		return;
	}

	global.api.request({
		'timeout': settings.timout || 3000,
		'url': settings.eta_url + imdb + '/releaseinfo'
	}, function(err, response, body) {

		// Log errors
		if(err){
			log.error(err);
			callback(null, {});
			return;
		}

		var $ = cheerio.load(body);

		// Find the title
		var title = $('title').text().split('-')[0];

		// Get all the dates and parse them
		var imdb_time = null;
		$('#tn15content > table td[align=right]').each(function() {
			var new_time = global.strtotime($(this).text());
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

	global.api.request({
		'timeout': settings.timout || 3000,
		'url': settings.ismovie_url + imdb + '/'
	}, function(error, response, body) {

		callback(null, !(body.toLowerCase().indexOf('(tv series') > -1));

	});

}
