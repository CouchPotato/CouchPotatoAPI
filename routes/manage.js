var redis = require('redis'),
	rclient = redis.createClient();

exports.cleanup = function(req, res) {


	if(!isWhitelisted(req.ip)){
		res.redirect('/');
		return;
	}

	var cleaning_key = 'cleaning_cron',
		now = Math.round(new Date().getTime() / 1000);

	rclient.get(cleaning_key, function(err, status) {

		// Already running
		if (status) {

			res.type('application/json');
			res.json({
				'message': 'Already running',
				'progress': status
			});

		}
		else {

			res.type('application/json');
			res.json({
				'message': 'Starting',
				'progress': status
			});

			rclient.set(cleaning_key, 1);

			rclient.zrangebyscore('user-last-request', '-inf', '+inf', function(err, result){

				result.forEach(function(item, nr){
					rclient.zremrangebyrank('usermovies:' + item, 0, -103);
				});

			});

			rclient.del(cleaning_key);

		}

	});

};
