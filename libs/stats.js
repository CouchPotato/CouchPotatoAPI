var crypto = require('crypto'),
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);

var allowed_platforms = ['windows', 'osx', 'linux'],
	allowed_types = ['git', 'source', 'desktop'];

exports.stats = function(req, res, next) {

	var version = req.header('x-cp-version') || '',

		// Create identifier based on IP if it doesn't exist
		user = (req.header('x-cp-identifier') || '').substr(0, 11),
		split = version.split('-');

	req.version = version;
	req.user = user;
	req.api_version = req.header('x-cp-api') || 0;
    req.identifier = req.header('x-cp-identifier') || null;

    // No user set, don't log (probably updater calls)
    if(!req.identifier){
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

	// OS/type stat counter
	if(req.stats && allowed_platforms.indexOf(req.stats.os) > -1 && allowed_types.indexOf(req.stats.type) > -1)
		rclient.zadd('stat-version-'+req.stats.os+'-'+req.stats.type, now, user);
	else {
//		log.error('Unknown os stats', {
//			'url': req.originalUrl,
//			'version': version,
//			'api_version': req.api_version,
//			'user': user,
//			'stats': req.stats
//		});
		rclient.zadd('stat-version-unknown', now, user);
	}

	// Increment hits
	rclient.incr('hits-by-day:' + day);
	rclient.incr('hits-by-by-month:' + month);

	// Set last request time for each user
	rclient.zadd('user-last-request', now, user);

	// Keep track of movies per user
	var imdb_id = req.url.match(/tt\d{7}/g);
	if(imdb_id && imdb_id.length == 1 && !req.query.ignore)
		rclient.zadd('usermovies:' + user, now, imdb_id[0]);

}
