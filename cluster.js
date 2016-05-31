var cluster = require('cluster');
var os = require('os');
var numCPUs = os.cpus().length;//获取CPU数量
var workers = {};

if(cluster.isMaster){
  //主进程分支
  cluster.on('death', function(worker){
    //当一个进程结束时，重启工作进程
    delete workers[worker.id];
    worker = cluster.fork();
    workers[worker.pid] = worker;
  });
  //初始开启CPU 数量相同的工作进程
  for(var i = 0; i < numCPUs; i++){
    var worker = cluster.fork();
    workers[worker.pid] = worker;
  }
}else{
  //工作进程分支，启动服务器
  var app = require('./app');
  app.listen(3000);
}
//当进程被终止时，关闭所有进程
process.on('SIGTERM',function(){
  for(var pid in workers){
    process.kill(pid);
  }
  process.exit(0);
});