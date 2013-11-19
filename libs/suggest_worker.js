var redis = require('redis'),
	rclient = redis.createClient();

// Wait for users to be received
process.on('message', function(users) {

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
			delete range, total_users, users_done;
			process.send({'type': 'done'});
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

});
