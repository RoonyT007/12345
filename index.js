

const express=require('express');
const path=require('path');
const io=require('socket.io');
const cors=require("cors");
const exp = require('constants');
const mongodb=require('mongodb').MongoClient;
const bodyparser=require('body-parser');
const nodeschedule=require('node-schedule');

const Player = require('./socket class/player');
const leaderboardroutes=require('./leaderboard');
const tournamentroutes=require('./tournament');

const today=new Date();
const custom=new Date(98,1);
const monthVer=Number(""+today.getFullYear()+(today.getMonth()/2));
const firstDay=new Date(today.getFullYear(),today.getMonth(),today.getDate()-today.getDay())
const lastDay=new Date(today.getFullYear(),firstDay.getMonth(),firstDay.getDate()+6);

const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const team=["Kolkata Knights","Mumbai Blasters","Chennai Warriors","Bangalore Strikers","Delhi Tigers","Punjab Panthers","Rajasthan Rulers","Lucknow Superstars","Gujarat Gaints","Hyderabad Hurricanes"];

let game={};
let players={};
let rooms=[];
let friendrooms=[];
const app=express();
app.use(cors());
app.use(bodyparser.json());
app.use(express.static(path.join(__dirname,'build')));
app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'build','index.html'))
})
const server=app.listen(4000);

app.use('/leaderboard',leaderboardroutes);
app.use('/tournament',tournamentroutes);
// ['https://www.handcricket.in','https://handcricket.in']
const Socket=new io.Server(server,{cors:{ origin:'*'}});

function createRoom(roomId){
    rooms.push(roomId);
    game[roomId]=[];
}
function createFriendRoom(roomId,player){
    if(!player.room){
    let uni=roomId.slice(0,6)+friendrooms.length;
    player.friend_room.room=uni;
    player.room=roomId;
    let obj={};
    obj[uni]=roomId;
    friendrooms.push(obj);
    game[roomId]=[];
    }
}
function datasharing(player,socket){
    var randomTossElgibility=Math.ceil(Math.random()*2)===1?"first":"second";
    if(Socket.sockets.adapter.rooms.get(player.room)!=undefined){
    Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el,index)=>{
        if(Socket.sockets.adapter.rooms.get(player.room).size===1){
           
                players[el].wait=1;
            
            Socket.sockets.in(el).emit("first-data",players[el]);
        }
        else if (Socket.sockets.adapter.rooms.get(player.room).size===2)
        {
            if(index===0){
                    players[el].wait=0;
                    players[el].tossElgibility=(randomTossElgibility==="first"?1:0);
                Socket.sockets.in(el).emit("first-data",players[el]);
            }
            else if(index===1){
                    players[el].wait=0;
                    players[el].tossElgibility=(randomTossElgibility==="second"?1:0);
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
} 
}

Socket.on('connect',async(socket)=>{
    //Socket.emit('total-player-data',Socket.sockets.sockets.size);
    
    
  let player=new Player(socket.id);
  players[socket.id]=player;
  socket.emit('player-data',player);
  socket.on('create-friend-room',(name,img)=>{
    if(name[0]!=undefined){
    player.friend_room.need=true;
    player.img=img;
    player.name=name[0].toUpperCase()+name.slice(1).toLowerCase();
    
    createFriendRoom(player.id+"room",player);
    joinRoom(socket,player);
    datasharing(player,socket);
    }
  })
  socket.on('join-friend-room',(name,img,roomIdCode)=>{
    if(name[0]!=undefined){
    player.friend_room.need=true;
    player.img=img;
    player.name=name[0].toUpperCase()+name.slice(1).toLowerCase();
    friendrooms.forEach(el=>{
        if(Object.keys(el)[0]===roomIdCode){
            player.friend_room.room=roomIdCode;
            player.room=Object.values(el)[0];
            socket.join(Object.values(el)[0]);
            datasharing(player,socket);
        }
    })
}
   
    
  })
    socket.on('need-room',(name,img,botId)=>{

        
        if(name!=undefined  ){
        player.botId=botId;
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

   datasharing(player,socket);
    
    }})
    socket.on("cancelMatch",()=>{
        if(player.friend_room.need!==true){
            socket.leave(player.room);
       
        delete game[rooms[rooms.indexOf(player.room)]];
        rooms.indexOf(player.room)!=-1&&rooms.splice(rooms.indexOf(player.room),1);
        player.room="";
        }
        else if(player.friend_room.need===true){
            socket.leave(player.room);
            delete game[rooms[rooms.indexOf(player.room)]];
            friendrooms.map(e=>Object.values(e)[0]).indexOf(player.room)!=-1&&friendrooms.splice(friendrooms.map(e=>Object.values(e)[0]).indexOf(player.room),1);
            player.room="";
            player.friend_room.need=false;
            player.friend_room.room="";
        }
        
    })
    socket.on('tossed',()=>{
        let headortails=Math.random()<=0.49?"heads":"tails"
        Socket.sockets.adapter.rooms.get(player.room)!=undefined &&Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el)=>{
            players[el].toss.tossed=true;
            players[el].toss.headortails=headortails;
                Socket.sockets.in(el).emit("tossed",players[el]);
            }
        )
    
    })
    
    socket.on('headortails',(data)=>{
       Socket.sockets.adapter.rooms.get(player.room)!=undefined && Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el,index)=>{
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
        Socket.sockets.adapter.rooms.get(player.room)!=undefined && Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el)=>{
                players[el].toss.coin=true;
                    Socket.sockets.in(el).emit('toss-completed',players[el]);
                })
        })
    socket.on("batorbowl",(data)=>{
        Socket.sockets.adapter.rooms.get(player.room)!=undefined && Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach((el,index)=>{
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
    if(Socket.sockets.adapter.rooms.get(player.room)!=undefined){
    player.data.run=Number(data);
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
        Socket.to(player.room).emit('run-data',{p1,p2});
        if(p1.completed.length===2 && p2.completed.length===2){
            rooms.pop(p1.room);
            Socket.socketsLeave(p1.room);
            delete game[rooms[rooms.indexOf(p1.room)]];
            rooms.indexOf(p1.room)!=-1&&rooms.splice(rooms.indexOf(p1.room),1);
            Socket.sockets.in(p1.id).disconnectSockets();
            Socket.sockets.in(p2.id).disconnectSockets();
            if(!(p1.friend_room.need===true||p1.friend_room.need===true)){
                mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority')
                .then(async(client)=>{await client.db().collection('rank').insertMany([{"name":p1.name,"score":p1.bat},{"name":p2.name,"score":p2.bat}]);
                await client.db().collection('weekrank').insertMany([{"name":p1.name,"score":p1.bat,time:new Date()},{"name":p2.name,"score":p2.bat,time:new Date()}]);
                await client.db().collection('Monthrank').insertMany([{"name":p1.name,"score":p1.bat,time:Number(""+new Date().getFullYear()+(new Date().getMonth()/2))},{"name":p2.name,"score":p2.bat,time:Number(""+new Date().getFullYear()+(new Date().getMonth()/2))}]);
                await client.close();}).catch(err=>{})
            }
            delete players[p1.id];
            delete players[p2.id];
            
        }

        
    }
    

}})
socket.on("disconnect",()=>{
    delete game[rooms[rooms.indexOf(player.room)]];
    rooms.indexOf(player.room)!=-1&&rooms.splice(rooms.indexOf(player.room),1);
    friendrooms.map(e=>Object.values(e)[0]).indexOf(player.room)!=-1&&friendrooms.splice(friendrooms.map(e=>Object.values(e)[0]).indexOf(player.room),1);
    Socket.sockets.adapter.rooms.get(player.room)!=undefined &&Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach(id=>{
        Socket.socketsLeave(player.room);
        Socket.sockets.in(id).emit("Opponent got disconnect");
        Socket.sockets.in(id).disconnectSockets();
        delete players[id];
    })
    delete players[player.id];
    Socket.emit('total-player-data',Socket.sockets.sockets.size);
})

socket.on("disconnect-player",()=>{
    delete game[rooms[rooms.indexOf(player.room)]];
    rooms.indexOf(player.room)!=-1&&rooms.splice(rooms.indexOf(player.room),1);
    friendrooms.map(e=>Object.values(e)[0]).indexOf(player.room)!=-1&&friendrooms.splice(friendrooms.map(e=>Object.values(e)[0]).indexOf(player.room),1);
    Socket.sockets.adapter.rooms.get(player.room)!=undefined &&Array.from(Socket.sockets.adapter.rooms.get(player.room)).forEach(id=>{
        Socket.sockets.in(id).emit("Opponent got disconnect",player.id);
        Socket.socketsLeave(player.room);
           Socket.sockets.in(id).disconnectSockets();
           
           delete players[id];

    })
    
})
})




//JOiN A RANDOM ROOM FUNCTION
function joinRoom(socket,player){
    if(player.friend_room.need===false){
    for(i=0;i<rooms.length;i++){
        let continueTrue=false;
        if(game[rooms[i]]!=undefined&&game[rooms[i]].length<=1){
            for (j of Object.values(players)){
                if(j.room===rooms[i]){
                    if(j.name===player.name){
                        continueTrue=true;
                       break;
                    }
                }
            }
                if(player.botId+"room"===rooms[i] && player.botId!=false){
                
            }
            else if(player.botId!=false){
                continue;
            }
            if(continueTrue){
                continue;
            }
            socket.join(rooms[i]);
            game[rooms[i]].push(player.id);
            player.room=rooms[i];
            break;
           }
}
    }
    else if (player.friend_room.need===true){
        socket.join(player.room);
        game[player.room].push(player.id);
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











/****JOB SCHEDULE****** */
/**For resetting the league  ***/


const job=nodeschedule.scheduleJob('0 0 0 1 * *',async()=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    try{
        
        const prevdate=new Date(new Date().getFullYear(),new Date().getMonth(),-2);
        const prevmonth=`${month[prevdate.getMonth()]} - ${prevdate.getFullYear()}`;

        const previousWinner=await Client.db().collection('tournament').findOne({month:prevmonth});
        const winningTeam=previousWinner!=null&& previousWinner.table.reduce((maxTeam,currentTeam)=>{
            if(maxTeam.score===currentTeam.score){
                return maxTeam.runs>currentTeam.runs?maxTeam:currentTeam;
            }
            else{
                return maxTeam.score>currentTeam.score?maxTeam:currentTeam;
            }
            
        });
        previousWinner!=null&&await Client.db().collection('tournament').findOneAndUpdate({month:"alltime",'table.team':winningTeam.team},{$inc:{'table.$.cups':1}});
    
        
        let newteams=team.map((el)=>{return({team:el,score:0,stage:"I",runs:0})});
        const newmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`;
        const beforedata={month:newmonth,table:newteams,time:new Date()};
    
        const precheck=await Client.db().collection('tournament').find({month:newmonth}).toArray();
        await Client.db().collection('tournamentData').deleteMany({});
       if(precheck.length==0){
        await Client.db().collection('tournament').insertOne(beforedata);
       }
    }
    catch(e){
        
    }
    finally{
        await Client.close();
    }
   

   
})


/**For selecting teams for playoffs  ***/
const playoffjob=nodeschedule.scheduleJob('0 0 0 20 * *',async()=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    try{
    const currentmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`;
    const precheck=await Client.db().collection('tournament').findOne({month:currentmonth});
    precheck.table.sort((a,b)=>{return b.runs-a.runs}).sort((a,b)=>{return(b.score-a.score)});
   
    const updatedPrecheck=precheck.table.map((e,ind)=>{
        if(ind>3){
            e.stage='E';
            
        }
        else{
            e.stage='P';
        }
        return e;
    })

    await Client.db().collection('tournament').updateOne({month:currentmonth},{$set:{table:precheck.table}});
    }
    catch(error){

    }
    finally{
        await Client.close();
    }
    

})

/**********For resetting the week league */

const weekJob=nodeschedule.scheduleJob('0 0 0 * * 7',async()=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');

    try{
        const cursordel=await Client.db().collection('weekrank').find({}).sort({score:-1}).limit(1).toArray();
        const prevarrays={name:cursordel[0].name,score:cursordel[0].score,time:cursordel[0].time,type:"week"};
        await Client.db().collection('winners').deleteMany({type:"week"});     
        await Client.db().collection('winners').insertOne(prevarrays);
        await Client.db().collection('weekrank').deleteMany({});
    }
   finally{
    await Client.close();
   }

})