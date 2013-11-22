var fs = require('fs');

/**
 * Return messages
 */
exports.list = function(req, res) {

	var messages = JSON.parse(fs.readFileSync('./data/messages.json').toString());

	res.type('application/json');
	res.json(messages);

};
