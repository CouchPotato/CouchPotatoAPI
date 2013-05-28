/**
 * Return the url source updater can find the zip
 */
exports.url = function(req, res) {

	res.type('application/json');
	res.json({
		'url': 'https://codeload.github.com/'+
			(req.query.repo || 'RuudBurger')+'/'+
			(req.query.name || 'CouchPotatoServer')+'/zip/'+
			(req.query.branch || 'master'),
		'type': 'zip'
	});

};
