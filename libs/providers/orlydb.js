var cheerio = require('cheerio'),
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename),
	scoring = {

		'bad.ivtc': -20, 'no.ivtc': -20, 'interlaced': -20, 'bad.pack': -20,
			'bad.fps': -20,

		'mislabeled': -40, 'grp.req': -40, 'oos': -40, 'out.of.sync': -40, 'ghosting': -40,
			'field.shifted': -40, 'dupe.frames': -40, 'blended.frames, ': -40,
			'custom.quant.matrix': -40,	'divx.not.allowed': -40, 'no.audio': -40,
			'missing.audio': -40, 'get.rerip': -40, 'get.proper': -40

	};

exports.validate = function(name, callback){

	api.request({
		'timeout': 3000,
		'url': 'http://orlydb.com/?q="' + name.replace(/[\.-]/g, '+') + '"'
	}, function(err, response, body){

		if(err){
			callback(err, 0);
			return;
		}

		var score = 0,
			reasons = [];

		var $ = cheerio.load(body);

		// Find the title
		var releases = $('#releases > div:not(#pager)');
		releases.each(function(nr, r){
			var r = $(r);
			if($('.release', r).text() != name) return;

			var nuke = $('.nuke', r).text();

			if(nuke){
				// Whatever nuke it is, always give negative score
				score -= 10;
				reasons.push('nuke');

				// Try and find some tags
				for(var i in scoring){
					if(nuke.indexOf(i) > -1){
						reasons.push(i);
						score += scoring[i]
					}
				}

			}
			else {
				reasons.push('scene');
				score += 40;
			}

		});

		callback(null, {
			'reasons': reasons,
			'score': score
		});

	});

}