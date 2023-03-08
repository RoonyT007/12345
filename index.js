const express=require('express');
const path=require('path');
const io=require('socket.io');
const cors=require("cors");
const Player = require('./socket class/player');
const exp = require('constants');
let game={};
let players={};
let rooms=[];
const app=express();
app.use(cors());
app.use(express.static(path.join(__dirname,'build')));
app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'build','index.html'))
})
const server=app.listen(4000);

const Socket=new io.Server(server,{cors:{ origin:"*"}});

function createRoom(roomId){
    rooms.push(roomId);
    game[roomId]=[];
}


Socket.on('connect',(socket)=>{

    Socket.emit('total-player-data',Socket.sockets.sockets.size);
    console.log(socket.id);
  let player=new Player(socket.id);
  players[socket.id]=player;
  socket.emit('player-data',player);
    socket.on('need-room',(name,img)=>{
        player.img=img;
        player.name=name[0].toUpperCase()+name.slice(1).toLowerCase();
                if(rooms.length===0){
            createRoom(player.id+"room");
            joinRoom(socket,player);
        }
        else{
            joinRoom(socket,player);
    }
    if(player.room.length===0){
        createRoom(player.id+"room");
        joinRoom(socket,player);
    }      
   Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el,index)=>{
        if(Socket.sockets.adapter.rooms.get(player.room).size===1){
           
                players[el].wait=1;
                players[el].tossElgibility=1
            
            Socket.sockets.in(el).emit("first-data",players[el]);
        }
        else if (Socket.sockets.adapter.rooms.get(player.room).size===2)
        {
            if(index===0){
                    players[el].wait=0;
                    players[el].tossElgibility=1
                Socket.sockets.in(el).emit("first-data",players[el]);
            }
            else if(index===1){
                    players[el].wait=0;
                    players[el].tossElgibility=0
                Socket.sockets.in(el).emit("first-data",players[el]);
            }
            
        }
    
   })   
   let p1=players[Array.from(Socket.sockets.adapter.rooms.get(player.room))[0]];
    let p2=players[Array.from(Socket.sockets.adapter.rooms.get(player.room))[1]];
    if(p1.name.length>0&&p2!=undefined){
         p1.opponent.name=p2.name;
         p1.opponent.img=p2.img;
     p2.opponent.name=p1.name;
     p2.opponent.img=p1.img;
     socket.emit('player-data',player);
    }
    
    
    })
    socket.on('tossed',()=>{
        let headortails=Math.random()<=0.49?"heads":"tails"
        Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el)=>{
            players[el].toss.tossed=true;
            players[el].toss.headortails=headortails;
                Socket.sockets.in(el).emit("tossed",players[el]);
            }
        )
    })
    
    socket.on('headortails',(data)=>{
        
            Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el,index)=>{
                if(player.toss.headortails===data){
                    
                    if(players[el].id===player.id){
                        
                    players[el].toss.result="win";
                    Socket.sockets.in(el).emit("toss-result",players[el]);
                    }
                    if(players[el].id!=player.id){
                        
                        players[el].toss.result="loss";
    
                    Socket.sockets.in(el).emit("toss-result",players[el]);
                    }
                }
                else{

                    if(players[el].id===player.id){
                       
                    players[el].toss.result="loss";

                    Socket.sockets.in(el).emit("toss-result",players[el]);
                    }
                    if(players[el].id!=player.id){
                      
                    players[el].toss.result="win";
                    Socket.sockets.in(el).emit("toss-result",players[el]);
                }
                }
            })
            
        })
    socket.on('toss-completed',()=>{
        console.log(1);
            Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el)=>{
                players[el].toss.coin=true;
                    Socket.sockets.in(el).emit('toss-completed',players[el]);
                })
        })
    socket.on("batorbowl",(data)=>{
        Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el,index)=>{
            if(socket.id===el){
                if(data==="Bat"){
                    players[el].toss.choose=data;
                    players[el].toss.schoose="Bowl";
                }
                else{
                    players[el].toss.choose=data;
                    players[el].toss.schoose="Bat";
                }
                Socket.sockets.in(el).emit("batorbowl",players[el]);
            }
            else{
                if(data==="Bat"){
                    players[el].toss.choose="Bowl";
                    players[el].toss.schoose="Bat";
                }
                else{
                    players[el].toss.schoose="Bowl";
                    players[el].toss.choose="Bat";
                }
                Socket.sockets.in(el).emit("batorbowl",players[el]);
                
            }

    })
})
socket.on('run',(data)=>{
    
    player.data.run=parseInt(data);
    player.data.server="received";
    if(player.overRuns.includes('W')){
        player.overRuns=[];
    }
    player.count=player.count+1;
    let p1=players[Array.from(Socket.sockets.adapter.rooms.get(player.room))[0]];
    let p2=players[Array.from(Socket.sockets.adapter.rooms.get(player.room))[1]];
   
   
    if(player.count%6===1&&player.count>1){
        player.overRuns=[];
    }
    if(p1.data.server==="received"&&p2.data.server==="received"){
        p1.data.over=`${Math.floor(p1.count/6)}.${p1.count%6}`;
        p2.data.over=`${Math.floor(p2.count/6)}.${p2.count%6}`;
        if(p1.data.run!=p2.data.run && (p1.completed.length===0?true:((p1.toss.schoose==="Bat"&&p1.bat+p1.data.run<=p1.bowl)||(p1.toss.schoose==="Bowl"&&p1.bat>=p1.bowl+p2.data.run)))){
            
            [p1,p2]=runSimulator(p1,p2);
        }
        else{
            if(p1.data.run!=p2.data.run){
                [p1,p2]=runSimulator(p1,p2);
            }
            if(p1.data.run==p2.data.run){
                p1.overRuns.push('W'),p2.overRuns.push('W');
            }
             if(p1.completed.length<1 && p2.completed.length<1){
                
                p1.completed.push(p1.toss.choose);
                p2.completed.push(p2.toss.choose);
                p1.count=0,p2.count=0;
            }
            else{
                p1.count=0,p2.count=0
                p1.completed.push(p1.toss.schoose);
                p2.completed.push(p2.toss.schoose);
                if(p1.bat>p1.bowl||p2.bowl>p2.bat){
                    p1.matchResult="Won"
                    p2.matchResult="Lost"
                }
                else if(p1.bat===p2.bat){
                    p1.matchResult="Draw"
                    p2.matchResult="Draw"
                }
                else{
                    p2.matchResult="Won"
                    p1.matchResult="Lost"
                }
            }
        }
        p1.data.server="";
        p2.data.server="";

        Socket.in(player.room).emit('run-data',{p1,p2});
        if(p1.completed.length===2 && p2.completed.length===2){
            rooms.pop(p1.room);
            Socket.socketsLeave(p1.room);
            delete game[rooms[rooms.indexOf(p1.room)]];
            rooms.indexOf(p1.room)!=-1&&rooms.splice(rooms.indexOf(p1.room),1);
            Socket.sockets.in(p1.id).disconnectSockets();
            Socket.sockets.in(p2.id).disconnectSockets();
            delete players[p1.id];
            delete players[p2.id];
            
        }

        
    }
    

})
socket.on("disconnect",()=>{
    
    delete game[rooms[rooms.indexOf(player.room)]];
    rooms.indexOf(player.room)!=-1&&rooms.splice(rooms.indexOf(player.room),1);
    (Socket.sockets.adapter.rooms.get(player.room)!=undefined)
    &&Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach(id=>{
        Socket.socketsLeave(player.room);
        Socket.sockets.in(id).emit("Opponent got disconnect");
        Socket.sockets.in(id).disconnectSockets();
        delete players[id];
    })
    delete players[player.id];
    Socket.emit('total-player-data',Socket.sockets.sockets.size);
})

socket.on("disconnect-player",()=>{
    console.log("disconnect player");
    delete game[rooms[rooms.indexOf(player.room)]];
    rooms.indexOf(player.room)!=-1&&rooms.splice(rooms.indexOf(player.room),1);
    Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach(id=>{
        Socket.sockets.in(id).emit("Opponent got disconnect",player.id);
        Socket.socketsLeave(player.room);
           Socket.sockets.in(id).disconnectSockets();
           
           delete players[id];

    })
    
})
})




//JOiN A RANDOM ROOM FUNCTION
function joinRoom(socket,player){
    for(i=0;i<rooms.length;i++){
        if(game[rooms[i]].length<=1){
            socket.join(rooms[i]);
            game[rooms[i]].push(player.id);
            player.room=rooms[i];
            break;
           }
}
}

function runSimulator(p1,p2){
    if((p1.toss.choose=="Bat" || p2.toss.choose==="Bat") && p1.completed.length===0 && p2.completed.length===0){//need to change the condition here
        if(p1.toss.choose=="Bat"){
            p1.bat=p1.data.run+p1.bat;
            p1.overRuns.push(p1.data.run),p2.overRuns.push(p1.data.run);
            p2.bowl=p1.bat;
        }
        else{
            p2.bat=p2.data.run+p2.bat;
            p1.overRuns.push(p2.data.run),p2.overRuns.push(p2.data.run);
            p1.bowl=p2.bat;
        }
        
    }
    else{
        if(p1.toss.schoose=="Bowl"){
        p2.bat=p2.data.run+p2.bat;
        p1.bowl=p2.bat;
        p1.overRuns.push(p2.data.run),p2.overRuns.push(p2.data.run);
        }
        else{
            p1.bat=p1.data.run+p1.bat;
            p1.overRuns.push(p1.data.run),p2.overRuns.push(p1.data.run);
            p2.bowl=p1.bat;
        }
    }
    return[p1,p2];
}