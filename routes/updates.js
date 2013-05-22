
exports.url = function(req, res) {

	res.type('application/json');
	res.json({
		'url': 'https://codeload.github.com/'+req.query.repo+'/'+req.query.name+'/zip/'+req.query.branch,
		'type': 'zip'
	});

};
