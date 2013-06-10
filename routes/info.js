/**
 * Get movie info by IMDB id
 */
exports.imdb = function(req, res) {

	var imdb = 'tt'+req.params.imdb;

	api.getMovieInfo(imdb, function(result){

		res.type('application/json');
		res.json(result);

	});

};