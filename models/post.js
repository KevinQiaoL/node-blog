var mongodb = require('./db');
var markdown = require('markdown').markdown;
function Post(name, head, title, tags, post){
	this.name = name;
	this.head = head;
	this.title = title;
	this.tags = tags;
	this.post = post;
}

module.exports = Post;

Post.prototype.save = function save(callback){
	var date = new Date();
	var time = {
		date  : date,
		year  : date.getFullYear(),
		month : date.getFullYear() + '-' + (date.getMonth() + 1),
		day  : date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate(),
		minute : date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes())
	}
	var post = {
		time : time,
		user : this.user,
		name: this.name,
        head: this.head,
        post: this.post,
        tags: this.tags,
        title: this.title,
        comments: [],
        pv: 0
	};
	mongodb.open(function(err , db){
		if(err){
			return callback(err);
		}
		//读取user集合
		db.collection('posts',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.findOne({
				title:post.title
			},function(err, post){
				if(post){
					mongodb.close();
					return callback(err);
				}
			});
			//写入post 文档
			collection.insert(post,{
				safe:true
			},function(err, post){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null, post['ops'][0]);
			});
		});
	});
};
Post.getAllBySize  = function get(name, page, callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		// 读取 posts 集合
		db.collection('posts',function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			// 查找 name 属性为 username 的文档,如果 username 是 null 则匹配全部
			var query = {};
			if(name){
				query.name = name;
			}
			//使用 count 返回特定查询的文档数 total
			collection.count(query, function (err, total) {
				if (err){
				  return callback(err);
				}
				//根据 query 对象查询，并跳过前 (page-1)*10 个结果，返回之后的 10 个结果
				collection.find(query,{
					skip : (page - 1)* 2,
					limit : 2
				}).sort({
				  time: -1
				}).toArray(function (err, docs) {
				  db.close();
				  if (err){
				      return callback(err);
				  }
				  /*docs.forEach(function (doc) {
				      doc.post = markdown.toHTML(doc.post);
				  });*/
				  return callback(null, docs, total);
				});
			});
		});
	});
}
// 根据用户名,标题,时间获取文章
Post.getOne = function(name, day, title, callback){
	//open db
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.findOne({
				'name'    : name,
				'title'   : title,
				'time.day':day 
			}, function(err, result){
				if(err){
					mongodb.close();
					return callback(err);
				}
				if(result){
					 //每访问 1 次，pv 值增加 1
					collection.update({
						'name':name,
						'time.day':day,
						'title':title
					},{
						$inc:{pv:1}
					}, function(err){
						mongodb.close();
						if(err){
							return callback(err);
						}
					});
				}
				/*if(result){
					result.post = markdown.toHTML(result.post);
					result.comments.forEach(function(comment){
						comment.contents = markdown.toHTML(comment.content);
					});
				}*/
				callback(null, result);
			})
		});
	})
}
//编辑
Post.edit = function(name, day, title, callback){
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.findOne({
				'name' : name,
				'time.day': day,
				'title' : title
			},function(err, results){
				mongodb.close();
				if(err){
					return callback(err);
				}else{
					callback(null, results);
				}
			});
		});
	});
}
//更新
Post.update = function(name, day, title, post, callback){
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.updateOne({
				'name' : name,
				'time.day' : day,
				'title' : title,
			},{
				$set :{post:post}
			}, function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}else{
					callback(null);
				}
			});
		});
	});
}
//删除
Post.remove = function(name, day, title, callback){
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.deleteOne({
				'name' : name,
				'time.day' : day,
				'title' : title
			}, function(err){
				mongodb.close();
				if(err){
					return callback(err);
				}else{
					callback(null);
				}
			});
		});
	});
}
//存档
Post.archive = function(callback){
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			collection.find({},{
				'name' : 1,
				'time' : 1,
				'title' : 1,
				'post' : 1
			},{
				sort : {time : -1}
			}).toArray(function(err, docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null, docs)
			});
		});
	});
}
//返回索引标签
Post.getTags = function(callback){
	mongodb.open(function(err, db) {
		if(err){
			return callback(err);
		}
		db.collection('posts',function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//distinct 用来找出给定键的所有不同值
			collection.distinct("tags", function(err, docs){
				mongodb.close();
				if(err) {
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}
//返回所有包含特定标签的所有文章
Post.filterByTag = function(tag, callback){
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//查询所有 tags 数组内包含 tag 的文档
            //并返回只含有 name、time、title 组成的数组
			collection.find({
				'tags':tag
			},{
				'name' : 1,
				'time' : 1,
				'title' : 1,
				'post' : 1
			}).sort({
				time : -1
			}).toArray(function(err, docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}
//搜索
Post.search = function(keyword, callback){
	mongodb.open(function(err, db){
		if(err){
			return callback(err);
		}
		db.collection('posts', function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			var pattern = new RegExp(keyword, "i");
			collection.find({
				'title' : pattern
			},{
				'name' : 1,
				'time' : 1,
				'title': 1,
				'post' : 1
			}).sort({
				time : -1
			}).toArray(function(err, docs){
				mongodb.close();
				if(err){
					return callback(err);
				}
				callback(null, docs);
			});
		});
	});
}

































