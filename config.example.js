module.exports = {
	common: {
		'moviedb': {
			'apikey': ''
		},
		'mdb': {
			'proxy_url': '',
			'info_url': '',
			'eta_url': '',
			'ismovie_url': '',
			'timeout': 10000
		},
		'rotten': {
			'apikey': '',
			'timeout': 10000
		},
		'mi': {
			'url': '',
			'timeout': 10000
		},
		'putio': {
			client_id: 0,
			secret: '',
			redirect_url: encodeURI('http://host.tld/authorize/putio/')
		},
		'veta': {
			'url': '',
			'timeout': 10000
		},
		'whitelisted_ips': ['::1', '127.0.0.1'],
		'suggested_movies': []
	},

	development: {},
	production: {}
};
