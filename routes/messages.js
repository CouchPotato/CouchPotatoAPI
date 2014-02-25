var fs = require('fs');

/**
 * Return messages
 */
var messages = JSON.parse(fs.readFileSync('./data/messages.json').toString());
exports.list = function(req, res) {

	res.type('application/json');
	res.json(messages);

};
