
exports.restrict = function(req, res, next) {

	if(!isWhitelisted(req.ip)){
		var stats = req.stats || {};
		if(!stats.os || !stats.type || !stats.version){
			res.status(404).send('Not found');
			return;
		}
		else if (req.api_version === 0){
			res.status(401).send('Failed because you are using an unsupported version of CP, please update');
			return;
		}
	}

	next();

}