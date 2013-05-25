/**
 * Get eta by IMDB id
 */
exports.imdb = function(req, res) {

	var imdb = 'tt'+req.params.imdb;

	global.api.getMovieEta(imdb, function(result){

		res.type('application/json');
		res.json(result);

	});

};
