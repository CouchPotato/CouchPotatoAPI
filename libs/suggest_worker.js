var redis = require('redis'),
    rclient = redis.createClient();

// Wait for users to be received
process.on('message', function(users) {

	var multi = rclient.multi();

	users.forEach(function(user){
		multi.zrevrange('usermovies:' + user, 0, 100); // Get last 100 movies from the user
	});

	multi.exec(function(err, result){

		var multi = rclient.multi();

		result.forEach(function(user_movies){

			user_movies.sort();
			user_movies.forEach(function(movie, nr){

				user_movies.slice(nr).forEach(function(next_movie){
					if(movie != next_movie)
						multi.zincrby('suggest_temp:' + movie, 1, next_movie);
				})

			});

		});

		multi.exec(function(err){
			process.send({'type': 'done'});
		});

	});

});
