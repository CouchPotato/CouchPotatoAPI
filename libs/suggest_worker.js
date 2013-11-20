var redis = require('redis'),
	rclient = redis.createClient();

// Wait for users to be received
process.on('message', function(users) {

	var range_multi = rclient.multi();

	users.forEach(function(user){
		range_multi.zrevrange('usermovies:' + user, 0, 100); // Get last 100 movies from the user
	});

	range_multi.exec(function(err, result){
		if(err) return;

		var inc = [],
			scores = {};

		result.forEach(function(user_movies){

			user_movies.sort();
			user_movies.forEach(function(movie, nr){

				user_movies.slice(nr).forEach(function(next_movie){
					if(movie != next_movie){

						if(!scores[movie])
							scores[movie] = {};
						if(!scores[movie][next_movie])
							scores[movie][next_movie] = 0;

						scores[movie][next_movie] += 1;
					}
				});

			});

		});

		for(var m in scores){
			for(var m2 in scores[m]){
				inc.push(['zincrby', 'suggest_temp:'+m, scores[m][m2], m2]);
			}
		}

		scores = null;

		rclient.multi(inc).exec(function(err, result){
			process.send({'type': 'done'});
		});

	});

});
