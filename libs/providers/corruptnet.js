var cheerio = require('cheerio'),
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
		'timeout': 6000,
		'url': 'https://pre.corrupt-net.org/search.php?search=' + name.replace(/[\s]/g, '.') + ''
	}, function(err, response, body){

		if(err){
			callback(err, 0);
			return;
		}

		var score = 0,
			reasons = [];

		try {
			var $ = cheerio.load(body);

			// Find the title
			var releases = $('table tr');

			releases.each(function(nr, r){
				var r = $(r),
					lc = r.html().toLowerCase();

				if(lc.indexOf('nuked') > -1 && lc.indexOf('unnuked') < 0){
					// Whatever nuke it is, always give negative score
					score -= 10;
					reasons.push('nuke');

					// Try and find some tags
					for(var i in scoring){
						if(lc.indexOf(i) > -1){
							reasons.push(i);
							score += scoring[i]
						}
					}
				}

			});
		}
		catch(e){
			log.error('Failed corrupt-net.org check for ' + name);
		}

		callback(null, {
			'reasons': reasons,
			'score': score
		});

	});

}
