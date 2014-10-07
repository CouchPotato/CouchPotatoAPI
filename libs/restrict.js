var log = global.createLogger(__filename)

exports.restrict = function(req, res, next) {

	if(!isWhitelisted(req.ip)){
		var stats = req.stats || {};
		if(!stats.os || !stats.type || !stats.version){
			log.error('404', {
				'url': req.originalUrl,
				'version': req.version,
				'api_version': req.api_version,
				'user': req.user,
				'stats': req.stats
			})
			res.status(404).send('Not found');
			return;
		}
		else if (req.api_version === 0 || req.identifier === null){
			res.status(401).send('Failed because you are using an unsupported version of CP, please update');
			return;
		}
	}

	next();

}