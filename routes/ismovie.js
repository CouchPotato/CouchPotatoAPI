/**
 * Check if IMDB id is a movie
 */
exports.imdb = function(req, res) {

	var imdb = 'tt'+req.params.imdb;

	global.api.isMovie(imdb, function(result){

		res.type('application/json');
		res.json({
			'is_movie': result
		});

	});

};