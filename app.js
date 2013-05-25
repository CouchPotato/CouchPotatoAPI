// Load settings first
var Settings = require('settings');
global.settings = new Settings(require('./config'));

// Load the api in global
global.api = require('./libs/api');
require('./libs/helpers')

// Import modules
var express = require('express'),

	// Routes
	home = require('./routes'),
	eta = require('./routes/eta'),
	ismovie = require('./routes/ismovie'),
	info = require('./routes/info'),
	search = require('./routes/search'),
	updates = require('./routes/updates'),

	// Stats & restriction
	stats = require('./libs/stats').stats,
	restrict = require('./libs/restrict').restrict,

	// HTTP server
	http = require('http');

var app = express();
	app.disable('x-powered-by');

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.compress());

// Replace header
app.use(function(req, res, next){
	res.setHeader('X-Powered-By', 'CouchPotato ('+app.get('port')+')');
	next();
});

// Use proper IP
app.enable('trust proxy');

// Development only
if(app.get('env') == 'development') {
	app.use(express.errorHandler());
	app.use(express.logger('dev'));
}

// Don't accept new incoming connections when restarting
var shutting_down = false;
app.use(function(req, res, next) {
	if (!shutting_down)
		return next();
	res.setHeader('Connection', 'close');
	return res.send(502, 'Server is in the process of restarting');
});

// Route
app.get('/', home.index);
app.get('/eta/tt:imdb(\\d+)', stats, restrict, eta.imdb);
app.get('/ismovie/tt:imdb(\\d+)', stats, restrict, ismovie.imdb);
app.get('/info/tt:imdb(\\d+)', stats, restrict,  info.imdb);
app.get('/search/:query', stats, restrict, search.query);
app.get('/updates/', stats, updates.url);

httpServer = http.createServer(app).listen(app.get('port'), function() {
	console.log('Express server listening on port ' + app.get('port'));
});

// Graceful shutdown
process.on('SIGTERM', function() {
	console.log('Received kill signal (SIGTERM), shutting down gracefully.');
	shutting_down = true;

	httpServer.close(function() {
		console.log('Closed out remaining connections.');
		return process.exit();
	});

	return setTimeout(function() {
		console.error('Could not close connections in time, forcefully shutting down');
		return process.exit(1);
	}, 30 * 1000);
});

