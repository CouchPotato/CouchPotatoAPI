var putio = global.settings.putio,
	redis = require('redis'),
	rclient = redis.createClient(),
	log = global.createLogger(__filename);

/**
 * Put IO connection
 */
exports.putio = function(req, res) {

	var url = 'https://api.put.io/v2/oauth2/authenticate' +
		'?client_id=' + putio.client_id +
		'&response_type=code' +
		'&redirect_uri=' + putio.redirect_url;

	var store_key = 'putio_authorize:' + req.ip;

	if(req.query.target){

		rclient.setex(store_key, 300, req.query.target, function(){
			res.redirect(url);
		});

	}
	else if(req.query.code){

		var url2 = 'https://api.put.io/v2/oauth2/access_token' +
			'?client_id=' + putio.client_id +
			'&client_secret=' + putio.secret +
			'&grant_type=authorization_code' +
			'&redirect_uri=' + putio.redirect_url +
			'&code=' + req.query.code;

		api.request({
			'url': url2,
			'json': true
		}, function(err, response, json) {

			rclient.get(store_key, function(err, url){
				if(url)
					res.redirect(url + '?1=1&oauth=' + json.access_token);
				else
					res.send('Please make sure to authorize put.io within 5 minutes.');
			});
		});
	}

};