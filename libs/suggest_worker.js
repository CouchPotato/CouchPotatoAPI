var redis = require('redis'),
	rclient = redis.createClient();

// Wait for users to be received
process.on('message', function(users) {

	var range_multi = rclient.multi(),
		done_users = 0,
		increments = [];

	users.forEach(function(user){
		range_multi.zrevrange('usermovies:' + user, 0, 100); // Get last 100 movies from the user
	});

	range_multi.exec(function(err, result){
		if(err) return;

		result.forEach(function(user_movies){

			var inc = [];

			user_movies.sort();
			user_movies.forEach(function(movie, nr){

				user_movies.slice(nr).forEach(function(next_movie){
					if(movie != next_movie){
						increments.push(movie + '-' + next_movie);
					}
				});

			});

		});

		process.send({'type': 'done', 'increments': increments});

	});

});
