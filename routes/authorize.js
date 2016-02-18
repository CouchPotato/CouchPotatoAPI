var putio = global.settings.putio,
	trakt = global.settings.trakt,
	twitter = global.settings.twitter,
	oauth = require('oauth'),
	redis = require('redis'),
	rclient = redis.createClient();

var consumer = new oauth.OAuth(
	'https://twitter.com/oauth/request_token', 'https://twitter.com/oauth/access_token',
	twitter.consumer_key, twitter.consumer_secret, '1.0A', twitter.redirect_url, 'HMAC-SHA1');

/**
 * Twitter connection
 */
exports.twitter = function(req, res) {

	var store_key = 'twitter_authorize:' + req.ip,
		store_key_secret = 'twitter_authorize_secret:' + req.ip;

	if(req.query.target){

		rclient.setex(store_key, 300, req.query.target, function(){

			consumer.getOAuthRequestToken(function(error, oauth_request_token, oauth_token_secret){
				if (error) {
					res.send(500, 'Error getting OAuth request token');
				} else {
					rclient.setex(store_key_secret, 300, oauth_token_secret, function(){
						res.redirect('https://twitter.com/oauth/authorize?oauth_token='+oauth_request_token);
					});
				}
			});

		});

	}
	else if(req.query.oauth_verifier){

		rclient.get(store_key_secret, function(err, secret) {

			consumer.getOAuthAccessToken(req.query.oauth_token, secret, req.query.oauth_verifier,

				function (error, oauth_access_token, oauth_access_token_secret, results) {
					if (error) {
						res.send(500, 'Error getting OAuth access token');
					} else {
						rclient.get(store_key, function (err, url) {
							if (url){
								res.redirect(url + '?1=1&access_token_key=' + oauth_access_token +
									'&access_token_secret=' + oauth_access_token_secret +
									'&screen_name=' + results.screen_name);
							}
							else {
								res.send('Please make sure to authorize twitter within 5 minutes.');
							}
						});
					}
				}
			);
		});

	}

};

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