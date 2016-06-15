var mongodb = require('./db');
var crypto = require('crypto');

function User(user){
	this.name = user.name;
	this.password = user.password;
	this.email = user.email;
	this.head = user.head;
}

module.exports = User;

User.prototype.save = function save(callback){
	var setNum = parseInt(Math.random()*4, 10);
	if( setNum == 0 ) return setNum+1;
	var md5 = crypto.createHash('md5'),
		email_MD5 = md5.update(this.email.toLowerCase()).digest('hex'),
		head = "https://robohash.org/" + email_MD5 +".png?set=set"+ setNum +"&size=48x48";
	var user = {
		name : this.name,
		password : this.password,
		email : this.email,
		head : head
	};
	mongodb.open(function(err , db){
		if(err){
			return callback(err);
		}
		//读取user集合
		db.collection('users',function(err, collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			//为 name 属性添加索引
			collection.ensureIndex('name',{unique:true});
			//写入 user 文档
			collection.insert(user,{
				safe:true
			},function(err, user){
				mongodb.close();
				if (err){
                    return callback(err);
                }
				callback(null, user['ops'][0]);
			});
		});
	});
};
User.get = function get(username, callback){
	mongodb.open(function(err,db){
		if(err){
			return callback(err);
		}
		// 读取 users 集合
		db.collection('users',function(err,collection){
			if(err){
				mongodb.close();
				return callback(err);
			}
			// 查找 name 属性为 username 的文档
			collection.findOne({
				'name':username
			},function(err, doc){
				mongodb.close();
				if(doc){
					// 封装文档为 User 对象
					var user = new User(doc);
					callback(err, user);
				}else{
					callback(err,null)
				}
			});
		});
	});
}