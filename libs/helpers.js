global.p = function(){
	console.log(arguments);
}

// check if ip is whitelisted
global.isWhitelisted = function(ip){
	return (global.settings.whitelisted_ips || []).indexOf(ip) != -1;
}

// Merge objects
global.merge = function(obj1, obj2) {

	for(var k in obj2) {
		try {
			if(obj2[k] && obj2[k].constructor == Array){  // Merge lists
				obj1[k] = obj2[k].concat(obj1[k]);
				obj1[k] = obj1[k].filter(function(elem, pos) {
					return obj1[k].indexOf(elem) == pos && elem != null;
				});
			}
			else if(obj2[k] && obj2[k].constructor == Object){ // Property in destination object set; update its value.
				obj1[k] = merge(obj1[k] || {}, obj2[k] || {});
			}
			else {
				if(obj1[k] && obj2[k] && obj1[k].length > obj2[k].length || !obj2[k])
					continue;
				else
					obj1[k] = obj2[k];
			}
		}
		catch(e) {
			obj1[k] = obj2[k];
		}
	}

	return obj1;
}

// Trim whitespace
global.trim = function(s){
	return String(s).replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '')
}

// Convert string representation of date and time to a timestamp
global.strtotime = function(text, now) {
	if (!text)
		return null;

	// Unecessary spaces
	text = text.trim()
		.replace(/\s{2,}/g, ' ')
		.replace(/[\t\r\n]/g, '')
		.toLowerCase();

	var parsed;

	if (text === 'now')
		return now === null || isNaN(now) ? new Date().getTime() / 1000 | 0 : now | 0;
	else if (!isNaN(parse = Date.parse(text)))
		return parse / 1000 | 0;
	if (text == 'now')
		return new Date().getTime() / 1000; // Return seconds, not milli-seconds
	else if (!isNaN(parsed = Date.parse(text)))
		return parsed / 1000;

	var match = text.match(/^(\d{2,4})-(\d{2})-(\d{2})(?:\s(\d{1,2}):(\d{2})(?::\d{2})?)?(?:\.(\d+)?)?$/);
	if (match) {
		var year = match[1] >= 0 && match[1] <= 69 ? +match[1] + 2000 : match[1];
		return new Date(year, parseInt(match[2], 10) - 1, match[3],
			match[4] || 0, match[5] || 0, match[6] || 0, match[7] || 0) / 1000;
	}

	var date = now ? new Date(now * 1000) : new Date();
	var days = {
		'sun': 0,
		'mon': 1,
		'tue': 2,
		'wed': 3,
		'thu': 4,
		'fri': 5,
		'sat': 6
	};
	var ranges = {
		'yea': 'FullYear',
		'mon': 'Month',
		'day': 'Date',
		'hou': 'Hours',
		'min': 'Minutes',
		'sec': 'Seconds'
	};

	function lastNext(type, range, modifier) {
		var day = days[range];

		if (typeof(day) !== 'undefined') {
			var diff = day - date.getDay();

			if (diff === 0)
				diff = 7 * modifier;
			else if (diff > 0 && type === 'last')
				diff -= 7;
			else if (diff < 0 && type === 'next')
				diff += 7;

			date.setDate(date.getDate() + diff);
		}
	}
	function process(val) {
		var split = val.split(' ');
		var type = split[0];
		var range = split[1].substring(0, 3);
		var typeIsNumber = /\d+/.test(type);

		var ago = split[2] === 'ago';
		var num = (type === 'last' ? -1 : 1) * (ago ? -1 : 1);

		if (typeIsNumber)
			num *= parseInt(type, 10);

		if (ranges.hasOwnProperty(range))
			return date['set' + ranges[range]](date['get' + ranges[range]]() + num);
		else if (range === 'wee')
			return date.setDate(date.getDate() + (num * 7));

		if (type === 'next' || type === 'last')
			lastNext(type, range, num);
		else if (!typeIsNumber)
			return false;

		return true;
	}

	var regex = '([+-]?\\d+\\s' +
		'(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?' +
		'|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday' +
		'|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday)|(last|next)\\s' +
		'(years?|months?|weeks?|days?|hours?|min|minutes?|sec|seconds?' +
		'|sun\\.?|sunday|mon\\.?|monday|tue\\.?|tuesday|wed\\.?|wednesday' +
		'|thu\\.?|thursday|fri\\.?|friday|sat\\.?|saturday))(\\sago)?';

	match = text.match(new RegExp(regex, 'gi'));
	if (!match)
		return false;

	for (var i = 0, len = match.length; i < len; i++)
		if (!process(match[i]))
			return false;

	// ECMAScript 5 only
	//if (!match.every(process))
	//	return false;

	return (date.getTime() / 1000);
}

global.randomString = function(len) {
    var charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
		s = '',
		len = len || 8;
    for (var i = 0; i < len; i++) {
    	var random_pos = Math.floor(Math.random() * charset.length);
    	s += charset.substring(random_pos,random_pos+1);
    }
    return s;
}
