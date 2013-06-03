var redis = require('redis'),
    rclient = redis.createClient(),
    fork = require('child_process').fork,
    cpus = require('os').cpus().length,
    cron_running = null;

/**
 * Give suggestions based on other movies
 */
exports.imdbs = function(req, res) {

	var imdbs = req.body.suggest || [req.params.imdb] || [],
		imdbs_ignore = req.body.ignore || [],
		union = ['out'],
		rem = ['out'];

	// Suggestions for
	union.push(imdbs.length);
	imdbs.forEach(function(imdb){
		union.push('suggest:tt'+imdb);
		rem.push(imdb);
	});

	// Ignore requested
	imdbs_ignore.forEach(function(imdb){
		rem.push('tt'+imdb);
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
	multi.zrevrange('out', 0, 5, 'WITHSCORES');
	multi.del('out');
	multi.exec(function(err, result){
		res.type('application/json');
		res.json(splitArray(result[result.length-2]));
	});

};

// Process user movies and fill suggestions
exports.cron = function(req, res){

	if(!global.isWhitelisted(req.ip)){
		res.redirect('/');
		return;
	}

	if(cron_running !== null){
		res.type('application/json');
		res.json({
			'message': 'Already running',
			'progress': cron_running
		});

		return;
	}

	cron_running = 0;

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

			// Rename them from temp
			result.forEach(function(suggest_key){
				var rename_to = suggest_key.replace('suggest_temp:', 'suggest:');
				var multi = rclient.multi();

				multi.rename(suggest_key, rename_to);
				multi.zadd('suggestions', now, rename_to);

				multi.exec()
			});

			// Get older suggestions and remove them
			rclient.zremrangebyscore('suggestions', '-inf', '('+now);

			res.type('application/json');
			res.json({});

			cron_running = null;

		});

	}

	var goWork = function(i){

		var users = results.splice(0, per_process);
		cron_running = Math.round((results.length / total)*10000)/100 + '%';

		// Send users to process to the worker
		workers[i].send(users);

	}

	var receiveMessage = function(i){

		// Send new users when one exits
		workers[i].on('message', function(message){

			if(message.type == 'done'){
				if(results.length > 0){
					goWork(i);
				}
				else {

					workers[i].disconnect();
					workers[i] = undefined;

					var active_workers = 0;
					for(var nr = 0; nr < cpus; nr++) {
						if(workers[nr])
							active_workers++;
					}

					// Workers are done, go process results
					if(active_workers == 0)
						doRename();

				}
			}

		});

	}

	rclient.zrangebyscore('user-last-request', (now)-2419200, now-10, function(err, result){

		results = result;
		total = result.length;

		// Spawn workers
		for(var nr = 0; nr < cpus; nr++) {
			workers[nr] = fork(__dirname+'/../libs/suggest_worker.js');

			receiveMessage(nr);
			goWork(nr);
		}

		res.type('application/json');
		res.json({
			'message': 'Running',
			'progress': cron_running
		});

	});

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
			var imdb = 'tt' + Math.floor(Math.random()*100);

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
    	result.push({'movie': key, 'score': odd_ones[nr]});
    });

    return result;
}