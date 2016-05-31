var express = require('express');
var router = express.Router();
var crypto = require('crypto');
var User = require('../models/user.js');
var Post = require('../models/post.js');
var Comment = require('../models/comment.js');
var pageSize = 2;
var ck_email = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
var ck_username = /^[A-Za-z0-9_]{1,20}$/;
var ck_password =  /^[A-Za-z0-9!@#$%^&*()_]{6,20}$/;

module.exports = function(app){
	app.get('/', function(req, res) {
		//throw new Error("An export error.");
		var name;
		if(!req.session.user){
			name = null
		}else{
			name = req.session.user.name;
		}
		//判断是否是第一页，并把请求的页数转换成 number 类型
		var page = req.query.p ? parseInt(req.query.p) : 1;
		//查询并返回第 page 页的 10 篇文章
		Post.getAllBySize(name, page, function(err, posts, total){
			if(err){
				posts = [];
			}
	  		res.render('index', {
	  			title: '首页',
	  			user : req.session.user,
	  			posts: posts,
	  			page : page,
	  			isFirstPage: (page - 1) == 0,
	  			isLastPage : (( page - 1 ) * 2  + posts.length) == total
	  		});
		});
	});
	//注册控制
	app.get('/reg',checkNotLogin);
	app.get('/reg', function(req, res) {
	  res.render('reg', { 
	  	title: '用户注册',
	  });
	});
	app.post('/reg',checkNotLogin);
	app.post('/reg',function(req, res){
		if(req.body['username'] == ""){
			req.flash('error','用户名不能为空');
			return res.redirect('/reg');
		}
		if(req.body['password'] == ""){
			req.flash('error','密码不能为空');
			return res.redirect('/reg');
		}
		if(req.body['password-repeat'] != req.body['password']){
			req.flash('error','两次输入的密码不一致');
			return res.redirect('/reg');
		}
		var md5 = crypto.createHash('md5');
		var password = md5.update(req.body.password).digest('hex');
		var newUser = new User({
			name: req.body.username,
			password: password,
			email : req.body.email
		});
		User.get(newUser.name,function(err, user){
			if(err){
				req.flash('error',err);
				return res.redirect('/reg');
			}
			if(user){
				req.flash('error','用户已存在');
				return res.redirect('/reg');
			}
			newUser.save(function(err, user){
				if(err){
					req.flash('error',err);
					return res.redirect('/reg');
				}
				req.session.user = user;
				req.flash('success','注册成功');
				res.redirect('/');
			});
		});
	});
	//登录控制
	app.get('/login',checkNotLogin);
	app.get('/login',function(req, res){
		res.render('login',{
			title: '登录',
			user : req.session.user
		});
	});
	app.post('/login',checkNotLogin);
	app.post('/login',function(req, res){
		var md5 = crypto.createHash('md5');
		var password = md5.update(req.body.password).digest('hex');
		User.get(req.body.username, function(err , user) {
			if (err){
			    req.flash('error', err);
			    return res.redirect('/login');
			}

			if(!user){
				req.flash('error','用户名不存在');
				return res.redirect('/login');
			}
			if(user.password != password){
				req.flash('error','密码错误');
				return res.redirect('/login');
			}
			console.log(user);
			req.session.user = user;
			req.flash('success','登录成功');
			res.redirect('/');
		})
	});
	//退出控制
	app.get('/logout',checkLogin);
	app.get('/logout', function(req, res) {
		req.session.user = null;
		res.redirect('/');
	});
	//搜索
	app.get('/search', function (req, res) {
        Post.search(req.query.keyword, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: "SEARCH:" + req.query.keyword,
                posts: posts,
                user: req.session.user
            });
            console.log(posts);
        });
    });
	//发表微博
	app.get('/post', checkLogin);
	app.get('/post', function (req, res) {
	  res.render('posts', {
	      title: '发表',
	      user: req.session.user
	  });
	});
	app.post('/post', checkLogin);
	app.post('/post', function(req, res){
		var currentUser = req.session.user;
		var tags = [req.body.tag1, req.body.tag2, req.body.tag3];
		post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);
		post.save(function(err){
			if(err){
				req.flash('err',err);
				req.redirect('/');
			}
			req.flash('success', '发表成功');
          	res.redirect('/');
		})
	});
	app.get('/u/:user', function(req, res) {
		var page = req.query.p ? parseInt(req.query.p) : 1;
		User.get(req.params.user, function(err, user) {
			if(err){
                req.flash('error', err);
                return res.redirect('/');
            }
			if (!user) {
				req.flash('error', '用户不存在');
				return res.redirect('/');
			}
			Post.getAllBySize(user.name, page, function(err, posts, total){
				if(err){
					req.flash('error', err);
					return res.redirect('/');
				}
		  		res.render('user', {
		  			title: user.name+'的博客',
		  			user : req.session.user,
		  			posts: posts,
		  			page : page,
		  			isFirstPage: (page - 1) == 0,
        			isLastPage: ((page - 1) * 2 + posts.length) == total,
		  		});
			});
		});
	});
	app.get('/u/:name/:day/:title', function(req, res){
		Post.getOne(req.params.name, req.params.day, req.params.title, function(err, post){
			if(err){
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('article',{
				title : req.params.title,
				post  : post,
				user  : req.session.user
			});
		});
	});
	app.post('/u/:name/:day/:title', function(req, res){
		var date = new Date(),
			time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
                date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var md5 = crypto.createHash('md5'),
            email_MD5 = md5.update(req.body.email.toLowerCase()).digest('hex'),
            head = "http://en.gravatar.com/" + email_MD5 + "?s=48";
        var comment = {
        	name : req.body.name,
        	head: head,
            email: req.body.email,
            website : req.body.website,
        	time : time,
        	content : req.body.content
        };
        var newComment = new Comment(req.params.name, req.params.day, req.params.title, comment);
        newComment.save(function(err){
        	if(err){
        		req.flash('error', err);
        		return res.res.redirect('back');
        	}
        	req.flash('success','留言成功');
        	res.redirect('back');
        });
	});
	//编辑
	app.get('/edit/:name/:day/:title', checkLogin);
	app.get('/edit/:name/:day/:title', function(req, res){
		Post.edit(req.params.name, req.params.day, req.params.title, function(err, post){
			if(err){
				req.flash('error', err);
				return res.redirect('back');
			}
			res.render('edit',{
				title: '编辑',
				post : post,
				user : req.session.user
			});
			console.log(post);
		});
	});
	app.post('/edit/:name/:day/:title', checkLogin);
	app.post('/edit/:name/:day/:title', function(req, res){
		var currentUser = req.session.user;
		Post.update(currentUser.name, req.params.day, req.params.title, req.body.post, function(err){
			var url = encodeURI('/u/'+ currentUser.name + '/' + req.params.day + '/' + req.params.title);
			if(err){
				req.flash('error', err);
				return res.redirect(url);
			}
			req.flash('success',  '修改成功');
			res.redirect(url);
		});
	});
	//删除
	app.get('/remove/:name/:day/:title', checkLogin);
	app.get('/remove/:name/:day/:title', function(req, res){
		Post.remove(req.params.name, req.params.day, req.params.title, function(err){
			if(err){
				req.flash('error', err);
				return res.redirect('back');
			}
			req.flash('success', '删除成功');
			res.redirect('/');
		});
	});
	//存档
	app.get('/archive', function(req, res){
		Post.archive(function(err, posts){
			if(err){
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('archive',{
				title :'存档',
				posts : posts,
				user  : req.session.user
			});
		});
	});
	//标签
	app.get('/tags', function(req, res){
		Post.getTags(function(err, posts){
			if(err){
				req.flash('error', err);
				return res.redirect('/');
			}
			res.render('tags',{
				title :'标签',
				posts : posts,
				user  : req.session.user
			});
		});
	});
	//获取相关标签页面
	app.get('/tags/:tag', function(req, res){
		Post.filterByTag(req.params.tag, function(err, posts){
			if(err){
				req.flash('error',err);
				return res.redirect('/');
			}
			res.render('tag',{
				title : 'Tag:' + req.params.tag,
				posts : posts,
				user  : req.session.user
			});
		});
	});
	//404
	app.use(function (req, res) {
        res.render("404",{
        	title:'出错啦！'
        });
    });
};
function checkLogin(req, res, next){
	if(!req.session.user){
		req.flash('error','未登录');
		return res.redirect('/login');
	}
	next();
}
function checkNotLogin(req, res, next){
	if(req.session.user){
		req.flash('error','已登录');
		return res.redirect('/');
	}
	next();
}
