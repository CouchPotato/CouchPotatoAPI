exports.imdb = function(req, res) {

	var imdb = 'tt'+req.params.imdb;

	global.api.getMovieInfo(imdb, function(result){

		res.type('application/json');
		res.json(result);

	});

};