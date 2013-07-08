/**
 * Return the url source updater can find the zip
 */
var correct_reg = /^([a-z]+)$/i;
var isAlphabetOnly = function(str){
    return str.match(correct_reg);
}

exports.url = function(req, res) {

	// Don't let packagers screw up requests
	var repo = req.query.repo && isAlphabetOnly(req.query.repo) ? req.query.repo : 'RuudBurger',
		name = req.query.name && isAlphabetOnly(req.query.name) ? req.query.name : 'CouchPotatoServer',
		branch = req.query.branch && isAlphabetOnly(req.query.branch) ? req.query.branch : 'master';

	res.type('application/json');
	res.json({
		'url': 'https://codeload.github.com/'+
			repo+'/'+
			name+'/zip/'+
			branch,
		'type': 'zip'
	});

};
