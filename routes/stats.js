var fs = require('fs'),
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);

/**
 * GET stats page.
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
		os_results = [],
		done = 3;

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

				// Do OS
				os_results.reverse()
				html = html.replace('{{os_data}}', JSON.stringify(os_results));

				res.send(html);
			});
		}
	}

	// Do user stats
	var user_stats = [
		{'name':'Current', 'range': [now-60, '+inf']},
		{'name':'Last hour', 'range': [now-3600, '+inf']},
		{'name':'Today', 'range': [now-86400, '+inf']},
		{'name':'Last week', 'range': [now-604800, '+inf']},
		{'name':'Last month', 'range': [now-2678400, '+inf']},
		{'name':'Last 3 months', 'range': [now-8035200, '+inf']},
		{'name':'All time', 'range': ['-inf', '+inf']},
	]

	var stat_multi = rclient.multi();

	user_stats.forEach(function(stat){
		stat_multi.zcount(ulr, stat.range[0], stat.range[1]);
	});

	stat_multi.exec(function(err, results){
		results.forEach(function(r, nr){
			user_results.push({
				'label': user_stats[nr].name,
				'y': parseInt(r),
				'indexLabel': (parseInt(r)/1000) + 'k'
			});
		});
		send_results();
	});


	// Do requests stats
	var last_x_days = 14,
		days = [];
	for(var i = 0; i < last_x_days; i++){
		days.push(i);
	};

	var days_multi = rclient.multi();

	days.forEach(function(nr){
		var d = new Date();
			d.setDate(d.getDate() - nr);
		var day = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();

		days_multi.get('hits-by-day:' + day);
	});

	days_multi.exec(function(err, results){
		results.forEach(function(r, nr){
			var d = new Date();
				d.setDate(d.getDate() - nr);
			var day = d.getUTCFullYear() + '-' + (d.getUTCMonth() + 1) + '-' + d.getUTCDate();

			request_results.push({
				'label': day,
				'y': parseInt(r),
				'indexLabel': parseInt(r) + ''
			});
		});
		send_results();
	});

	// Version stats
	var allowed_platforms = ['windows', 'osx', 'linux'],
		allowed_types = ['git', 'source', 'desktop'],
		total_gets = allowed_platforms.length * allowed_types.length,
		os_data = {},
		done_gets = 0;

	var os_results_build = function(){

		allowed_types.forEach(function(type, nr) {
			var platform_data = {
				'type': 'stackedColumn',
				'legendText': type,
				'showInLegend': true,
				'dataPoints': []
			};

			allowed_platforms.forEach(function (platform) {
				platform_data.dataPoints.push({
					'y': parseInt(os_data[platform][type]),
					'label': type
				});
			});

			os_results.push(platform_data);
		});

		send_results();
	};

	allowed_platforms.forEach(function(platform){
		os_data[platform] = {};
		allowed_types.forEach(function(type){
			os_data[platform][type] = 0;
			rclient.zcount('stat-version-' + platform + '-' + type, '-inf', '+inf', function(err, results){
				os_data[platform][type] = parseInt(results);
				done_gets++;

				if(total_gets == done_gets)
					os_results_build();
			})
		});
	});

};
