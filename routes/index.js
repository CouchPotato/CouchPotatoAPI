var fs = require('fs'),
	redis = require('redis'),
    rclient = redis.createClient();

/**
 * GET home page.
 */
exports.index = function(req, res) {

	if(global.isWhitelisted(req.ip)){
		var ulr = 'user-last-request',
			now = Math.round(new Date().getTime() / 1000);

		var user_results = [],
			request_results = [],
			done = 2;

		var send_results = function(){
			done--;
			if(done == 0){
				fs.readFile('./views/stats.html', 'utf8', function(err, html){

					// Options
					var options = JSON.stringify({
						'animation': false,
						'scaleFontSize': 10
					});
					html = html.replace(new RegExp("{{options}}", "g"), options);

					// Do by days
					var labels = [], values = [];
					user_results.reverse();
					user_results.forEach(function(day){
						labels.push(day[0]);
						values.push(day[1]);
					});

					var data = JSON.stringify({
						'labels': labels,
						'datasets': [{ 'data': values }]
					});
					html = html.replace('{{day_data}}', data);

					// Do requests
					var labels = [], values = [];
					request_results.reverse();
					request_results.forEach(function(day){
						labels.push(day[0]);
						values.push(day[1]);
					});

					var data = JSON.stringify({
						'labels': labels,
						'datasets': [{ 'data': values }]
					});
					html = html.replace('{{request_data}}', data);

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
				user_results.push([stat.name, result]);

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
				request_results.push([day, result]);

				if(request_results.length == last_x_days)
					send_results();
			});
		});


// 'hits-by-day:' + day,
// 'hits-by-by-month:' + month,
// 'hits-by-user:' + user,
// 'hits-by-user-by-day:' + user + ':' + day

//	keys.push('hits-by-movie:' + imdb_id);
//	keys.push('hits-by-movie-by-type:' + imdb_id + ':' + req.url.split('/')[1]);

	}
	else {
		res.send('You\'re weird');
	}
};
