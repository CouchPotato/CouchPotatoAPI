var crypto = require('crypto'),
	redis = require('redis'),
	rclient = redis.createClient()
	geoip = require('geoip'),
	city = new geoip.City('data/GeoLiteCity.dat'),
	stats_geo = settings.stats.geo;

var md5 = function(string){
	return crypto.createHash('md5').update(string).digest('hex')
}

exports.stats = function(req, res, next) {

	var version = req.header('x-cp-version') || '',

		// Create identifier based on IP if it doesn't exist
		user = (req.header('x-cp-identifier') || '').substr(0, 11),
		split = version.split('-');

    req.api_version = req.header('x-cp-api') || 0;
    req.identifier = req.header('x-cp-identifier') || null;

    // No user set, don't log
    if(!user){
        // rclient.zincrby('user-old-version', 1, req.ip + (version ? ' ' + version : ''));
        next();
        return;
    }

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

	// Send out location for map stats
	if(stats_geo){
		var geo_hash = 'geo_cache:' + md5(user + req.ip);

		rclient.get(geo_hash, function(err, result){
			if(result){
				rclient.publish('location', result);
			}
			else {
				city.lookup(req.ip, function(err, data) {
					if (data) {
						var lat_long = [data.latitude, data.longitude].join(',');
						rclient.publish('location', lat_long);
						rclient.set(geo_hash, lat_long);
					}
				});
			}
		});
	}

}
