/**
 * Return messages
 */
exports.list = function(req, res) {

	res.type('application/json');
	res.json([
		{
			'id': 5,
			'time': strtotime('2013-11-17 19:30'),
			'important': true,
			'message': 'Go checkout the new browser extensions for <a href="https://addons.mozilla.org/en-US/firefox/addon/couchpotato/" target="_blank">Firefox</a> and <a href="https://chrome.google.com/webstore/detail/couchpotato/jochingjncojldfclaicaomboafaiong" target="_blank">Chrome</a>! Will make your ass a lot fatter ;)',
		}
	]);

};
