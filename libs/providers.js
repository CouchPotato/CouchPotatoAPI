var providers = ['omdb', 'mdb', 'tmdb', 'rotten', 'mi', 'veta', 'corruptnet'],
	apis_calls = ['eta', 'info', 'search', 'ismovie', 'validate'],
	apis = {};

// Loop over providers and merge the calls
providers.forEach(function(provider_name){
	var provider = require('./providers/' + provider_name)
	apis_calls.forEach(function(api){
		if(!provider[api]) return;

		if(!apis[api]) apis[api] = [];
		apis[api].push(provider[api]);

	});
});

// Bind param and callback
apis_calls.forEach(function(api){

	exports[api] = function(arg){
		var ret = [];
		apis[api].forEach(function(provider){
			ret.push(function(callback){
				provider(arg, callback);
			});
		});
		return ret
	}

});
