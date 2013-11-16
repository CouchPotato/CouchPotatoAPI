/**
 * Get eta by IMDB id
 */
exports.name = function(req, res) {

	var name = new Buffer(req.params.name, 'base64').toString('binary');

	api.isValid(name, function(result){

		res.type('application/json');
		res.json(result);

	});

};
