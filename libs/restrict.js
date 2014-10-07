var version_error = 'Unsupported version of CP, please update',
	not_found = 'Not found';

exports.restrict = function(req, res, next) {

	if(!isWhitelisted(req.ip)){
		var stats = req.stats || {};
		if(!stats.os || !stats.type || !stats.version){
//			log.error('404', {
//				'url': req.originalUrl,
//				'version': req.version,
//				'api_version': req.api_version,
//				'user': req.user,
//				'stats': req.stats
//			})
			res.status(404).send(req.user || req.api_version > 0 ? version_error : not_found);
			return;
		}
		else if (req.api_version === 0 || req.identifier === null){
			res.status(401).send(version_error);
			return;
		}
	}

	next();

}
