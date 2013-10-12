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
		},
		{
			'id': 3,
			'time': strtotime('2013-10-12 20:00'),
			'important': true,
			'message': 'New donation options are available on <a href="https://couchpota.to/#support" target="_blank">couchpota.to</a>. Just saying ;)',
		},
	]);

};
