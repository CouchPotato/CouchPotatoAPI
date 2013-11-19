var redis = require('redis'),
	async = require('async'),
	rclient = redis.createClient(),
	fork = require('child_process').fork,
	cpus = require('os').cpus().length;

/**
 * Give suggestions based on other movies
 */
exports.imdbs = function(req, res) {

	var imdbs_suggest = (req.body.movies || req.query.movies || '').split(','),
		imdbs_ignore = (req.body.ignore || req.query.ignore || '').split(','),
		union = ['out'],
		rem = ['out'];

	// Suggest for first time users
	if(imdbs_suggest.length == 1 && !imdbs_suggest[0])
		imdbs_suggest = [settings.suggested_movies[Math.floor(Math.random() * settings.suggested_movies.length)]]

	// Suggestions for
	union.push(imdbs_suggest.length);
	imdbs_suggest.forEach(function(suggest){
		union.push('suggest:'+suggest);
		rem.push(suggest);
	});

	// Ignore requested
	imdbs_ignore.forEach(function(imdb){
		if(imdb.length == 9)
			rem.push(imdb);
	});

	if(union.length == 2){
		res.type('application/json');
		res.json([]);
		return;
	}

	// Get suggestions
	var multi = rclient.multi();
	multi.zunionstore(union); // Get all requested
	multi.zrem(rem) // Remove ignored
	multi.zrevrange('out', 0, 9, 'WITHSCORES');
	multi.del('out');
	multi.exec(function(err, result){

		var movies = splitArray(result[result.length-2]),
			func_list = [];

		movies.forEach(function(movie){

			func_list.push(function(callback){
				api.getMovieInfo(movie.imdb, function(movie_info){
					callback(null, merge(movie, movie_info));
				});
			});

		});

		async.series(func_list, function(err, results){
			res.type('application/json');
			res.json(results);
		});

	});

};

// Process user movies and fill suggestions
exports.cron = function(req, res){

	if(!isWhitelisted(req.ip)){
		res.redirect('/');
		return;
	}

	var keeper_key = 'suggest_cron';

	rclient.get(keeper_key, function(err, status){

		// Already running
		if(status){

			res.type('application/json');
			res.json({
				'message': 'Already running',
				'progress': status
			});

		}
		else {

			// Set running
			rclient.set('suggest_cron', '100%');

			var workers = [],
				date = new Date(),
				now = Math.round(date.getTime() / 1000),
				results,
				total,
				per_process = 100;

			var doRename = function(){

				// Get all temp suggestion keys
				rclient.keys('suggest_temp:*', function(err, result){

					console.log('Suggestions: ' + result.length);

					result.forEach(function(suggest_key){
						var rename_to = suggest_key.replace('suggest_temp:', 'suggest:');

						// Rename them from temp
						var multi = rclient.multi();
							multi.rename(suggest_key, rename_to);
							multi.zadd('suggestions', now, rename_to);
							multi.exec()

						// Limit them with score of 20 and up, or 500 per set
						var multi = rclient.multi();
							multi.zremrangebyscore(rename_to, '-inf', '(100');
							multi.zremrangebyrank(rename_to, 0, -499);
							multi.exec()
					});

					// Get older suggestions and remove them
					rclient.zrangebyscore('suggestions', '-inf', '('+now, function(err, result){

						var multi = rclient.multi();
							multi.del(result);
							multi.zremrangebyscore('suggestions', '-inf', '('+now);
							multi.del(keeper_key);
							multi.exec();

					})

				});

			}

			var goWork = function(i){

				var users = results.splice(0, per_process);
				rclient.set(keeper_key, Math.round((results.length / total)*10000)/100 + '%');

				// Send users to process to the worker
				if(users.length == 0){
					doRename();
				}
				else {

					var range = [],
						total_users = users.length,
						users_done = 0;

					users.forEach(function(user){
						range.push(['zrevrange', 'usermovies:' + user, 0, 100]); // Get last 100 movies from the user
					});

					var is_done = function(){
						users_done++;

						//process.send({'type': 'message', 'message': users_done + '/' + total_users});
						if(users_done == total_users){
							goWork();
						}
					}

					rclient.multi(range)
						.exec(function(err, result){

							if(err) return;

							var inc = [],
								total_movies = 0,
								total_processed = 0;

							result.forEach(function(user_movies){

								var total_combinations = 0;

								// Total combinations
								var length = user_movies.length;
								for(var i = length; i > 0; i--)
									total_combinations += i;
								total_combinations -= length;

								if(total_combinations <= 0){
									is_done();
								}
								else {

									user_movies.sort();
									user_movies.forEach(function(movie, nr){

										user_movies.slice(nr).forEach(function(next_movie){
											if(movie != next_movie)
												rclient.zincrby('suggest_temp:' + movie, 1, next_movie, function(){
													total_processed++;

													if(total_processed >= total_combinations)
														is_done();
												});
										});

									});
								}

							});

						});
				}

			}

			// Get last months user
			rclient.zrangebyscore('user-last-request', (now)-2419200, now-10, function(err, result){

				results = result;
				total = result.length;

				goWork();

				res.type('application/json');
				res.json({
					'message': 'Running',
					'progress': '100%'
				});

			});

		}

	})


};

var test = function(){

	var date = new Date(),
		now = Math.round(date.getTime() / 1000);

	// Create random users
	var multi = rclient.multi();
	for(var i = 0; i < 20000; i++){
		var user = makeid();

		// Set last request time for each user
		multi.zadd('user-last-request', now, user);

		var movie_count = Math.floor(Math.random()*100);
		for(var nr = 0; nr < movie_count; nr++){
			var imdb = 'tt08003' + Math.floor(Math.random()*99);

			multi.zadd('usermovies:' + user, now, imdb);

		}

	}

	multi.exec();

}

var makeid = function(){
	var text = "";
	var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

	for( var i=0; i < 10; i++ )
		text += possible.charAt(Math.floor(Math.random() * possible.length));

	return text;
}

var splitArray = function (items) {
	var odd_ones = [],
		even_ones = [],
		length = items.length,
		result = [];

	for(var i=0; i < length; i++)
		(i % 2 == 0 ? even_ones : odd_ones).push(items[i]);

	even_ones.forEach(function(key, nr){
		result.push({'imdb': key, 'suggest_score': odd_ones[nr]});
	});

	return result;
}