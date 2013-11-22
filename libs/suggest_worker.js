var redis = require('redis'),
	fs = require('fs'),
	rclient = redis.createClient();

// Wait for users to be received
process.on('message', function(data) {

	var users = data.users,
		range_multi = rclient.multi(),
		done_users = 0,
		increments = '';

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
						increments += movie + '-' + next_movie + '\n';
					}
				});

			});

		});

		fs.appendFileSync('./data/suggestions_' + data.i + '.txt', increments);

		process.send({'type': 'done'});

	});

});
