var crypto = require('crypto')
	redis = require('redis'),
    rclient = redis.createClient();;

var md5 = function(string){
	return crypto.createHash('md5').update(string).digest('hex')
}

exports.stats = function(req, res, next) {

	var version = req.header('HTTP_X_CP_VERSION') || '',

		// Create identifier based on IP if it doesn't exist
		user = (req.header('HTTP_X_CP_IDENTIFIER') || md5(req.ip)).substr(0, 10),
		split = version.split('-');

	api_version = req.header('HTTP_X_CP_API') || 0;

	if(split.length == 4){
		req.stats = {
			'os': global.trim(split[0]),
			'type': global.trim(split[1]),
			'version': global.trim(split[2]).substr(0, (v_type == 'desktop' ? 10 : 8))
		};
	}

	next();

	// Save statistics
	var date = new Date(),
		month = date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1),
		day = month + '-' + date.getUTCDate();

	var keys = [
		'hits-by-day:' + day,
		'hits-by-by-month:' + month,
		'hits-by-user:' + user,
		'hits-by-user-by-day:' + user + ':' + day
	];

    var imdb_id = req.url.match(/tt(\d{7})/);
	if(imdb_id){
		keys.push('hits-by-movie:' + imdb_id[0]);
		keys.push('hits-by-movie-by-type:' + imdb_id[0] + ':' + req.url.split('/')[0]);
	}

	for(i in keys) {
		rclient.incr(keys[i]);
	}


}