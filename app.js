var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ueditor = require("ueditor");
var qiniu_config = require("./qiniu");
var routes = require('./routes/index');
var fs = require('fs');

var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var settings = require("./settings");

var flash = require('connect-flash');

var accessLog = fs.createWriteStream('access.log', {flags: 'a'});
var errorLog = fs.createWriteStream('error.log', {flags: 'a'});

var app = express();

// view engine setup
app.set('port', process.env.PORT || '3000');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(logger('combined',{stream:accessLog}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: settings.cookieSecret,
  key: settings.db,//cookie name
  cookie: {maxAge: 1000 * 60 * 60 * 24 * 30},//30 days
  resave: false,
  saveUninitialized: true,
  store: new MongoStore({
    url: 'mongodb://localhost/microblog'
  })
}));
app.use(flash());

app.use("/ueditor/ue", ueditor(path.join(__dirname, 'public'), function(req, res, next) {
    // ueditor 客户发起上传图片请求
    if (req.query.action === 'uploadimage') {
        //res.ue_up(img_url); //你只要输入要保存的地址 。保存操作交给ueditor来做
        res.ue_up();
    }
    //  客户端发起图片列表请求
    else if (req.query.action === 'listimage') {
        res.ue_list(); // 客户端会列出 dir_url 目录下的所有图片
    }
    // 客户端发起其它请求
    else {
        // console.log('config.json')
        res.setHeader('Content-Type', 'application/json');
        res.redirect('/ueditor/nodejs/config.json');
    }
}));

app.use(function (err, req, res, next) {
  var meta = '[' + new Date() + '] ' + req.url + '\n';
  errorLog.write(meta + err.stack + '\n');
  next();
});

app.use(function(req, res, next){
  //console.log(req.session.user);
  res.locals.user = req.session.user;
  res.locals.post = req.session.post;
  var error = req.flash('error');
  res.locals.error = error.length ? error : null;
  var success = req.flash('success');
  res.locals.success = success.length ? success : null;
  next();
})

routes(app);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

//var server = https.createServer(options,app);
if(!module.parent){
  app.listen(app.get('port'), function(){
    console.log('Blog server listening on port ' + app.get('port'));
  });
}


module.exports = app;
