
exports.restrict = function(req, res, next) {

	if(!global.isWhitelisted(req.ip)){
		var stats = req.stats || {};
		if(!stats.v_os || !stats.v_type || !stats.v_version){
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