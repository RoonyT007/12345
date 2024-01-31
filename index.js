

const express=require('express');
const path=require('path');
const io=require('socket.io');
const cors=require("cors");
const exp = require('constants');
const mongodb=require('mongodb').MongoClient;
const bodyparser=require('body-parser');
const nodeschedule=require('node-schedule');

const Player = require('./socket class/player');


const playersCanContribute=[];
module.exports.playersCanContribute=playersCanContribute;

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
//   console.log('No.of Players=',Object.keys(players).length,'No.of Rooms=',rooms.length,'game array',game);
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
    if(player.room.length===0&&player.botId==false){
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
            playersCanContribute.push(p1.id);
            playersCanContribute.push(p2.id);
           
            Socket.socketsLeave(p1.room);
            delete game[rooms[rooms.indexOf(p1.room)]];
            rooms.indexOf(p1.room)!=-1&&rooms.splice(rooms.indexOf(p1.room),1);
            // rooms.pop(p1.room);
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
    if(player.room.length===0){
       player.room=player.id+'room';
    }
    delete game[rooms[rooms.indexOf(player.room)]];
    delete game[player.room];
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
/**For updating the table  ***/

const jobRule = new nodeschedule.RecurrenceRule();
jobRule.hour = 0;  // 0 corresponds to midnight
jobRule.minute = 0; 

const dailyjob=nodeschedule.scheduleJob(jobRule,async()=>{
    const today = new Date();
    today.setDate(today.getDate() -1);
    const indianTime = today.toLocaleDateString("en-US", {timeZone: 'Asia/Kolkata'});
    let prevIndianDate=indianTime.split('/')[1];
    const currentmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`;
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    try{
       
        if(new Date().getDate()<=28 && new Date().getDate()!=1){
            
            let todayMatchData=await Client.db().collection('fixtureOriginal').findOne({});
            if(new Date().getDate()==1){
                prevIndianDate=28;
            }
            todayMatchData[prevIndianDate].forEach( async(e,ind)=>{
                if(e!=null){
                        if(e.team1[1]!=e.team2[1] ){
                            await Client.db().collection('fixtureOriginal').findOneAndUpdate({[prevIndianDate+".team1"]:e.team1},{$set:{[prevIndianDate+".$."+"won"]:e.team1[1]>e.team2[1]?e.team1[0]:e.team2[0]}});
                            
                            if(new Date().getDate()<=25){
                                await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,"table.team":e.team1[0]},{$inc:{"table.$.played":1,"table.$.won":e.team1[1]>e.team2[1]?1:0,"table.$.lost":e.team1[1]>e.team2[1]?0:1,"table.$.runs":e.team1[2],"table.$.points":e.team1[1]>e.team2[1]?2:0}});
                                await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,"table.team":e.team2[0]},{$inc:{"table.$.played":1,"table.$.won":e.team1[1]>e.team2[1]?0:1,"table.$.lost":e.team1[1]>e.team2[1]?1:0,"table.$.runs":e.team2[2],"table.$.points":e.team1[1]>e.team2[1]?0:2}});
                            }
                           
                        }
                        else if (e.team1[1]==e.team2[1] && e.team1[2]!=e.team2[2]){
                            await Client.db().collection('fixtureOriginal').findOneAndUpdate({[prevIndianDate+".team1"]:e.team1},{$set:{[prevIndianDate+".$."+"won"]:e.team1[2]>e.team2[2]?e.team1[0]:e.team2[0]}});
                            if(new Date().getDate()<=25){
                            await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,"table.team":e.team1[0]},{$inc:{"table.$.played":1,"table.$.won":e.team1[2]>e.team2[2]?1:0,"table.$.lost":e.team1[2]>e.team2[2]?0:1,"table.$.runs":e.team1[2],"table.$.points":e.team1[2]>e.team2[2]?2:0}});
                            await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,"table.team":e.team2[0]},{$inc:{"table.$.played":1,"table.$.won":e.team1[2]>e.team2[2]?0:1,"table.$.lost":e.team1[2]>e.team2[2]?1:0,"table.$.runs":e.team2[2],"table.$.points":e.team1[2]>e.team2[2]?0:2}});
                            }
                        }
                        else if(e.team1[2]==e.team2[2]){
                            await Client.db().collection('fixtureOriginal').findOneAndUpdate({[prevIndianDate+".team1"]:e.team1},{$set:{[prevIndianDate+".$."+"won"]:"Draw"}});
                            if(new Date().getDate()<=25){
                            await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,"table.team":e.team1[0]},{$inc:{"table.$.played":1,"table.$.draw":1,"table.$.runs":e.team1[2],"table.$.points":1}});
                            await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,"table.team":e.team2[0]},{$inc:{"table.$.played":1,"table.$.draw":1,"table.$.runs":e.team2[2],"table.$.points":1}});
                            }
                        }
                        const topContributor=await Client.db().collection(`topContributors${ind}`).find().sort({points:-1}).limit(1).toArray();
                        if(topContributor.length>0){
                            await Client.db().collection('playerStats').updateOne({name:topContributor[0].name},{$inc:{mom:1}},{upsert:true});
                            await Client.db().collection('fixtureOriginal').findOneAndUpdate({[prevIndianDate+".team1"]:e.team1},{$set:{[prevIndianDate+".$."+"mom"]:topContributor[0].name}});
                            await Client.db().collection(`topContributors${ind}`).deleteMany({});
                        }

                        if((todayMatchData[prevIndianDate].length-1)===ind && new Date().getDate()<=24 &&new Date().getDate()!=1 ){
                            await Client.close();
                        }

                    }
            });
    
        }

        if(new Date().getDate()==1){


            const prevdate=new Date(new Date().getFullYear(),new Date().getMonth(),-2);
            const prevmonth=`${month[prevdate.getMonth()]} - ${prevdate.getFullYear()}`;
            // new logic
            // const winner=await Client.db().collection('fixtureOriginal').findOne({});
            // winner!=null&&await Client.db().collection('tournament').findOneAndUpdate({month:"alltime",'table.team':winner[28].won},{$inc:{'table.$.cups':1}});

            // old logic
            const previousWinnerTeam=await Client.db().collection('tournament').findOne({month:prevmonth});
            const winningTeam=previousWinnerTeam!=null&& previousWinnerTeam.table.reduce((maxTeam,currentTeam)=>{
                if(maxTeam.score===currentTeam.score){
                    return maxTeam.runs>currentTeam.runs?maxTeam:currentTeam;
                }
                else{
                    return maxTeam.score>currentTeam.score?maxTeam:currentTeam;
                }
                
            });
            previousWinnerTeam!=null&&await Client.db().collection('tournament').findOneAndUpdate({month:"alltime",'table.team':winningTeam.team},{$inc:{'table.$.cups':1}});


            
    
            const previousWinner=await Client.db().collection('tournament').findOne({month:prevmonth});
             // old logic ends

            // new logic
            // await Client.db().collection('playerStats').updateOne({name:previousWinner.mot[0]},{$inc:{mot:1}},{upsert:true});
             // new logic ends


            await Client.db().collection('playerStats').updateOne({name:previousWinner.orange[0]},{$inc:{ocap:1}},{upsert:true});
            await Client.db().collection('playerStats').updateOne({name:previousWinner.purple[0]},{$inc:{pcap:1}},{upsert:true});

        let newteams=team.map((el)=>{return({team:el,played:0,won:0,lost:0,draw:0,runs:0,points:0})});
        const newmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`;
        const beforedata={month:newmonth,table:newteams,time:new Date()};
    
       
        await Client.db().collection('tournamentData').deleteMany({});
        await Client.db().collection('ManOfTheTournament').deleteMany({});
        await Client.db().collection('topContributors0').deleteMany({});
        await Client.db().collection('topContributors1').deleteMany({});
        await Client.db().collection('fixtureOriginal').deleteMany({});

        let data=await Client.db().collection('fixture').findOne({});
        await Client.db().collection('fixtureOriginal').insertOne(data);
        
        await Client.db().collection('tournament').updateOne({month:beforedata.month},{$set:{...beforedata}},{upsert:true});


        // month league reset
        const today=new Date();
        const monthVer=Number(""+today.getFullYear()+(today.getMonth()/2));
        const prevcursor=await Client.db().collection('Monthrank').find({time:{$lt:monthVer}}).sort({score:-1}).limit(1);
        const prevarrays=await prevcursor.toArray();
        if(prevarrays.length>=1){
            await Client.db().collection('winners').deleteMany({type:"month"});
            prevarrays[0].type="month";
            await Client.db().collection('winners').insertOne(prevarrays[0]);
        }
        await Client.db().collection('Monthrank').deleteMany({time:{$lt:monthVer}});






        await Client.close();

        }
        if(new Date().getDate()==25){
            const top4Teams=await Client.db().collection('tournament').aggregate([
                {$match:{month:currentmonth}},
                {
                    $unwind: '$table'
                  },
                  {
                    $sort: { 'table.points':-1,'table.runs':-1}
                  }, {
                    $group: {
                      _id: '$_id',
                      month:{$first:'$month'},
                      table: {$push: '$table' }
                    }
                  }
            ]).toArray();
            console.log(top4Teams[0].table[0]);
            await Client.db().collection('fixtureOriginal').updateOne({},{$set:{ '25':[{ team1: [top4Teams[0].table[0].team,0,0], team2: [top4Teams[0].table[1].team,0,0], won: '' ,mom:''}],'26':[{ team1: [top4Teams[0].table[2].team,0,0], team2: [top4Teams[0].table[3].team,0,0], won: '' ,mom:''}]}},{upsert:true});
            await Client.close();
            }
        else if(new Date().getDate()==26){
            const teamsForFinals=await Client.db().collection('fixtureOriginal').findOne({});
            await Client.db().collection('fixtureOriginal').updateOne({},{$set:{'27':[{ team1: [teamsForFinals[25][0].won==teamsForFinals[25][0].team1[0]?teamsForFinals[25][0].team2[0]:teamsForFinals[25][0].team1[0],0,0], team2: ['TBD',0,0], won: '',mom:'' }],'28':[{ team1: [teamsForFinals[25][0].won,0,0], team2: ['TBD',0,0], won: '' ,mom:''}]}},{upsert:true});
            await Client.close()
        }
        else if(new Date().getDate()==27){
            const teamsForQualifier2=await Client.db().collection('fixtureOriginal').findOne({});
            await Client.db().collection('fixtureOriginal').updateOne({},{$set:{'27':[{ team1: [teamsForQualifier2[25][0].won==teamsForQualifier2[25][0].team1[0]?teamsForQualifier2[25][0].team2[0]:teamsForQualifier2[25][0].team1[0],0,0], team2: [teamsForQualifier2[26][0].won,0,0], won: '',mom:'' }]}},{upsert:true});
            await Client.close()
            }
        else if(new Date().getDate()==28){
            const teamsForQualifier2=await Client.db().collection('fixtureOriginal').findOne({});
            await Client.db().collection('fixtureOriginal').updateOne({},{$set:{'28':[{ team1: [teamsForQualifier2[25][0].won,0,0], team2: [teamsForQualifier2[27][0].won,0,0], won: '' }]}},{upsert:true});
            await Client.close()
        }
    }
    catch(e){
        // console.log(e);
    }
    finally{
        // console.log("ended");
        
    }
 
    
})



// For resetting the week league


// const weekJob=nodeschedule.scheduleJob('0 0 0 * * 7',async()=>{
//     const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');

//     try{
//         const cursordel=await Client.db().collection('weekrank').find({}).sort({score:-1}).limit(1).toArray();
//         const prevarrays={name:cursordel[0].name,score:cursordel[0].score,time:cursordel[0].time,type:"week"};
//         await Client.db().collection('winners').deleteMany({type:"week"});     
//         await Client.db().collection('winners').insertOne(prevarrays);
//         await Client.db().collection('weekrank').deleteMany({});
//     }
//    finally{
//     await Client.close();
//    }

// })



