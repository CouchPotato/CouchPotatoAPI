var crypto = require('crypto'),
	redis = require('redis'),
	rclient = redis.createClient();

var md5 = function(string){
	return crypto.createHash('md5').update(string).digest('hex')
}

exports.stats = function(req, res, next) {

	var version = req.header('x-cp-version') || '',

		// Create identifier based on IP if it doesn't exist
		user = (req.header('x-cp-identifier') || md5(req.ip)).substr(0, 11),
		split = version.split('-');

	req.api_version = req.header('x-cp-api') || 0;

	if(split.length == 4){
		req.stats = {
			'os': trim(split[0]),
			'type': trim(split[1]),
			'version': trim(split[2]).substr(0, (trim(split[1]) == 'desktop' ? 10 : 8))
		};
	}

	next();

	// Save statistics
	var date = new Date(),
		month = date.getUTCFullYear() + '-' + (date.getUTCMonth() + 1),
		day = month + '-' + date.getUTCDate(),
		now = Math.round(date.getTime() / 1000);

	var keys = [
		'hits-by-day:' + day,
		'hits-by-by-month:' + month,
	];

	// Add keys in one go
	var multi = rclient.multi();

	// Increment all keys
	for(i in keys) {
		multi.incr(keys[i]);
	}

	// Set last request time for each user
	multi.zadd('user-last-request', now, user);

	// Keep track of movies per user
	var imdb_id = req.url.match(/tt\d{7}/g);
	if(imdb_id && imdb_id.length == 1)
		multi.zadd('usermovies:' + user, now, imdb_id[0]);

	// Run all commands
	multi.exec();

}