var fs = require('fs'),
	path = require('path');

/**
 * Return messages
 */
var messages = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/messages.json')).toString()),
    legacy_message = {
        "time": 1400766111,
        "message": "It looks like you're running an outdated CouchPotato. Please update, be awesome.",
        "important": true
    };

exports.list = function(req, res) {

	res.type('application/json');

    if(req.api_version === 0 || req.identifier === null){
        var msgs = messages.slice(0);
        msgs.unshift(legacy_message);
        res.json(msgs);
    }
    else {
        res.json(messages);
    }


};
