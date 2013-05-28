function zerofill(n, p, c) {
    var pad_char = typeof c !== 'undefined' ? c : '0',
    	pad = new Array(1 + p).join(pad_char);
    return (pad + n).slice(-pad.length);
}

// Create logger
exports.createLogger = function(name){

	var winston = require('winston');
	var prepend_message = function(message){
		var d = new Date();
		return d.getDate() + "-"
                + (d.getMonth()+1) + ' '
                + zerofill(d.getHours(), 2) + ":"
                + zerofill(d.getMinutes(), 2) + ":"
                + zerofill(d.getSeconds(), 2) +
                ' [' + name.substr(-20).toLowerCase().replace('.js', '').replace(/\//g, '.') + '] ' + message;
	}

	return {

		info: function(message){
			winston.info(prepend_message(message));
		},

		error: function(message){
			winston.error(prepend_message(message));
		}

	}

}