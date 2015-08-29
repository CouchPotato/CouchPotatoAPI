var putio = global.settings.putio,
	trakt = global.settings.trakt,
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


/**
 * Trakt connection
 */
exports.trakt = function(req, res) {

	var url = 'https://api-v2launch.trakt.tv/oauth/authorize' +
		'?client_id=' + trakt.client_id +
		'&response_type=code' +
		'&redirect_uri=' + trakt.redirect_url;

	var store_key = 'trakt_authorize:' + req.ip;

	if(req.query.target){

		rclient.setex(store_key, 300, req.query.target, function(){
			res.redirect(url);
		});

	}
	else if(req.query.code){

		var data = {
			'client_id': trakt.client_id,
			'client_secret': trakt.secret,
			'grant_type': 'authorization_code',
			'redirect_uri': trakt.redirect_url,
			'code': req.query.code
		};

		api.request({
			'url': 'https://api-v2launch.trakt.tv/oauth/token',
			'method': 'post',
			'headers': {
				'Content-Type': 'application/json'
			},
			'body': JSON.stringify(data),
			'json': true
		}, function(err, response, json) {

			rclient.get(store_key, function(err, url){
				if(url)
					res.redirect(url + '?1=1&oauth=' + json.access_token + '&refresh=' + json.refresh_token);
				else
					res.send('Please make sure to authorize trakt.tv within 5 minutes.');
			});
		});
	}

};


/**
 * Trakt connection
 */
exports.trakt_refresh = function(req, res) {

	var url = 'https://api-v2launch.trakt.tv/oauth/token',
		data = {
			'refresh_token': req.query.token,
			'client_id': trakt.client_id,
			'client_secret': trakt.secret,
			'grant_type': 'refresh_token',
			'redirect_uri': trakt.redirect_url
		};

	api.request({
		'url': url,
		'method': 'post',
		'headers': {
			'Content-Type': 'application/json'
		},
		'body': JSON.stringify(data),
		'json': true
	}, function(err, response, json) {

		if(err || !json || !json.access_token || !json.refresh_token){
			res.send({
				'success': false
			});
		}
		else {
			res.send({
				'success': true,
				'oauth': json.access_token,
				'refresh': json.refresh_token
			});
		}
	});

};