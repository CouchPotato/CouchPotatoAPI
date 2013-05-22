// Load settings first
var Settings = require('settings');
global.settings = new Settings(require('./config'));

// Load the api in global
global.api = require('./libs/api');
require('./libs/helpers')

// Import modules
var express = require('express'),
	home = require('./routes'),
	eta = require('./routes/eta'),
	ismovie = require('./routes/ismovie'),
	info = require('./routes/info'),
	search = require('./routes/search'),
	http = require('http'),
	path = require('path');

var app = express();
	app.disable('x-powered-by');

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.compress());

app.use(function(req, res, next){
	res.setHeader('X-Powered-By', 'CouchPotato ('+app.get('port')+')');
	next();
});

// development only
if(app.get('env') == 'development') {
	app.use(express.errorHandler());
	app.use(express.logger('dev'));
}

app.get('/', home.index);
app.get('/eta/tt:imdb(\\d+)', eta.imdb);
app.get('/ismovie/tt:imdb(\\d+)', ismovie.imdb);
app.get('/info/tt:imdb(\\d+)', info.imdb);
app.get('/search/:query', search.query);

http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});
