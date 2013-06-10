var fs = require('fs'),
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);;

/**
 * GET home page.
 */
exports.show = function(req, res) {

	if(!isWhitelisted(req.ip)){
		res.redirect('/');
		return;
	}

	var ulr = 'user-last-request',
		now = Math.round(new Date().getTime() / 1000);

	var user_results = [],
		request_results = [],
		done = 2;

	var send_results = function(){
		done--;

		if(done == 0){

			fs.readFile('./views/stats.html', 'utf8', function(err, html){

				if(err){
					log.error(err);
					res.send('Something went wrong');
					return;
				}

				// Do by days
				user_results.reverse()
				html = html.replace('{{user_data}}', JSON.stringify(user_results));

				// Do requests
				request_results.reverse()
				html = html.replace('{{request_data}}', JSON.stringify(request_results));

				res.send(html);
			});
		}
	}

	// Do user stats
	var user_stats = [
			{'name':'Last hour', 'range': [now-3600, '+inf']},
			{'name':'Today', 'range': [now-86400, '+inf']},
			{'name':'Last week', 'range': [now-604800, '+inf']},
			{'name':'Last month', 'range': [now-2678400, '+inf']},
			{'name':'Last 3 months', 'range': [now-8035200, '+inf']},
			{'name':'All time', 'range': ['-inf', '+inf']},
		]
	user_stats.forEach(function(stat){
		rclient.zcount(ulr, stat.range[0], stat.range[1], function(err, result){
			user_results.push({'label': stat.name, 'y': parseInt(result)});

			if(user_results.length == user_stats.length)
				send_results();
		});

	});


	// Do requests stats
	var last_x_days = 14,
		days = [];
	for(var i = 0; i < last_x_days; i++){
		days.push(i);
	};

	days.forEach(function(nr){
		var d = new Date();
			d.setDate(d.getDate() - nr);
		var day = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();

		rclient.get('hits-by-day:' + day, function(err, result){
			request_results.push({'label': day, 'y': parseInt(result)});

			if(request_results.length == last_x_days)
				send_results();
		});
	});

};
