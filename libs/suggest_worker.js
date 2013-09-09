var redis = require('redis'),
	rclient = redis.createClient();

// Wait for users to be received
process.on('message', function(users) {

	var range = [];

	users.forEach(function(user){
		range.push(['zrevrange', 'usermovies:' + user, 0, 100]); // Get last 100 movies from the user
	});

	rclient.multi(range)
		.exec(function(err, result){
	
			var inc = []
	
			result.forEach(function(user_movies){
	
				user_movies.sort();
				user_movies.forEach(function(movie, nr){
	
					user_movies.slice(nr).forEach(function(next_movie){
						if(movie != next_movie)
							inc.push(['zincrby', 'suggest_temp:' + movie, 1, next_movie]);
					});
	
				});
	
			});
	
			rclient
				.multi(inc)
				.exec(function(err){
					process.send({'type': 'done'});
				});
	
		});
	
	var range, inc;

});
