/**
 * Return messages
 */
exports.list = function(req, res) {

	res.type('application/json');
	res.json([
		{
			'id': 1,
			'time': strtotime('2013-05-02 15:00'),
			'important': true,
			'message': 'If you read this, you are awesome. Thanks for using CouchPotato!',
		}
	]);

};
