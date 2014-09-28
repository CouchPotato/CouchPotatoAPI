var fs = require('fs');

/**
 * Return the url source updater can find the zip
 */
var correct_reg = /^([a-z]+)$/i;
var isAlphabetOnly = function(str){
	try { return str.match(correct_reg); }
	catch(e) { return false; }
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

var build_data = JSON.parse(fs.readFileSync('./data/builds.json').toString()),
	builds = '';

build_data.versions.forEach(function(build){
	build_data.urls.forEach(function(url){
		var href = url.replace(/\{version\}/g, build);
		builds += '<div><a href="'+href+'">'+href.split('/').pop()+'</a></div>'
	});
});

exports.builds = function(req, res) {

	res.type('text/html');
	res.end('<html><body><h1>CouchPotato Versions</h1>'+builds+'</body></html>');

};
