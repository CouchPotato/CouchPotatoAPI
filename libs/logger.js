var util = require('util');

function zerofill(n, p, c) {
	var pad_char = typeof c !== 'undefined' ? c : '0',
		pad = new Array(1 + p).join(pad_char);
	return (pad + n).slice(-pad.length);
}

// Create logger
exports.createLogger = function(name){

	var winston = require('winston');
	var prepend_message = function(message, extra){
		var d = new Date();
		return d.getDate() + "-"
				+ (d.getMonth()+1) + ' '
				+ zerofill(d.getHours(), 2) + ":"
				+ zerofill(d.getMinutes(), 2) + ":"
				+ zerofill(d.getSeconds(), 2) +
				' [' + name.substr(-20).toLowerCase().replace('.js', '').replace(/\//g, '.') + '] ' + message + (!extra ? '' : ' extra: ' + util.inspect(extra));
	}

	return {

		info: function(message, extra){
			winston.info(prepend_message(message, extra));
		},

		error: function(message, extra){
			winston.error(prepend_message(message, extra));
		}

	}

}
