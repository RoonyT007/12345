

const express=require('express');
const path=require('path');
const {Server}=require('socket.io');
const cors=require("cors");
const exp = require('constants');
const mongodb=require('mongodb').MongoClient;
const bodyparser=require('body-parser');
const nodeschedule=require('node-schedule');



const app=express();
const server=app.listen(4000);


app.use(cors());
app.use(bodyparser.json());

const io=new Server(server,{cors:{ origin:'*'}});
app.use(express.static(path.join(__dirname,'build')));
app.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname,'build','index.html'))
});

const playersCanContribute=[];
const emptyRooms={'2Overs':[],'Limitless Block':[]};
const friendRooms={};
const rooms={};
const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const team=["Kolkata Knights","Mumbai Blasters","Chennai Warriors","Bangalore Strikers","Delhi Tigers","Punjab Panthers","Rajasthan Rulers","Lucknow Superstars","Gujarat Gaints","Hyderabad Hurricanes"];
const timerObj={timerIntervalFunc:null,timerOn:false};


module.exports.playersCanContribute=playersCanContribute;
module.exports.emptyRooms=emptyRooms;
module.exports.friendRooms=friendRooms;
module.exports.rooms=rooms;
module.exports.io=io;
module.exports.timerObj=timerObj;

const { socketLeaveRoom, createRoom, joinRoom, startTimer, stopTimer, disconnectSocketsFromRoom, acknowledgementFunc, tossFunc, emitDataToRoom,removeRoomIdFromEmptyRoom, getRoomDataInsideRoomObj } = require('./socket functions/socketFunctions');
const {animationDone} = require('./socket functions/animationDone');
const { checkWhetherMatchmaked } = require('./socket functions/checkWhetherMatchmaked');







const leaderboardroutes=require('./leaderboard');
const tournamentroutes=require('./tournament');

app.use('/leaderboard',leaderboardroutes);
app.use('/tournament',tournamentroutes);









// ['https://www.handcricket.in','https://handcricket.in']











io.on('connection',async(socket)=>{

    if(!timerObj.timerOn){
        startTimer();
    }
    socket.on('cancel-matchmaking',(gameMode,callback)=>{
        let roomId=socket.roomId;
        if(rooms[roomId]!=undefined){
        if(rooms[roomId].gameType=='random'){
            let index=emptyRooms[gameMode].indexOf(roomId);
            if(index==-1){
                 callback(false)
            }
            else{
                removeRoomIdFromEmptyRoom(roomId,gameMode)
                delete rooms[roomId];
                callback(true);
            }
        }
        else if(rooms[roomId].gameType=='friend'){
            if(rooms[roomId].status=='match-making'){
                delete friendRooms[roomId];
                delete rooms[roomId];
                 callback(true);
            }
            else{
                 callback(false)     
            }
        }
    }
    else{
        callback(true);
    }
   
       
    })
    socket.on('join-room',(playerName,profileImgName,roomTypeData,gameMode)=>{
        socket.name=playerName;
        socketLeaveRoom(socket,socket.id);
            
            if((roomTypeData.roomType=='random'&& emptyRooms[gameMode]!=undefined&&emptyRooms[gameMode].length==0) ||(roomTypeData.roomType=='friend'&& roomTypeData.action=='create') ){
                
                createRoom(socket,playerName,profileImgName,roomTypeData,gameMode);
            }
            else if(emptyRooms[gameMode]!=undefined  ||(roomTypeData.roomType=='friend'&& roomTypeData.action=='join')){
                joinRoom(socket,playerName,profileImgName,roomTypeData,gameMode);
            }
    

        
    })

    socket.on('acknowledgement',(forWhat)=>{
        acknowledgementFunc(socket,forWhat);
    })

    socket.on('got-opponent',(roomId)=>{
        checkWhetherMatchmaked(roomId);
    })

    socket.on('toss',()=>{
        tossFunc('initiate-toss',socket)
    })

    socket.on('toss-call',(tossCall)=>{
        tossFunc('toss-call',socket,tossCall)
    });
    
    socket.on('validate-toss-result',()=>{
        tossFunc('validate-toss-result',socket)
    });
    socket.on('toss-choose',(batOrBall)=>{
        tossFunc('toss-choose',socket,batOrBall)
    });
    socket.on('emit-run-data',(run)=>{
        tossFunc('emit-run-data',socket,run)
    });
    socket.on('animation-done',()=>{
        animationDone(socket.roomId,socket.name);
    });
    socket.on('disconnect',()=>{
        let playersCanContributeIndex=playersCanContribute.indexOf(socket.id)
        playersCanContributeIndex!=-1 && playersCanContribute.splice(playersCanContributeIndex,1);
        if(getRoomDataInsideRoomObj(socket.roomId,'status')==='match-ended'){
            disconnectSocketsFromRoom(socket.roomId,'match-ended');
        }
        else{
            disconnectSocketsFromRoom(socket.roomId,'user-disconnected');
            
        }
        
        if(timerObj.timerOn&&io.of('/').sockets.size==0){
            stopTimer();
        }
    })
})










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
       
        if(new Date().getDate()<=28){
            
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
            const winner=await Client.db().collection('fixtureOriginal').findOne({});
            winner!=null&&await Client.db().collection('tournament').findOneAndUpdate({month:"alltime",'table.team':winner[28][0].won},{$inc:{'table.$.cups':1}});

            
    
            const previousWinner=await Client.db().collection('tournament').findOne({month:prevmonth});


            await Client.db().collection('playerStats').updateOne({name:previousWinner.mot[0]},{$inc:{mot:1}},{upsert:true});
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
        const prevarrays=await Client.db().collection('Monthrank').find({}).sort({wins:-1}).limit(1).toArray();
        if(prevarrays.length>=1){
            await Client.db().collection('winners').deleteMany({type:"month"});
            prevarrays[0].type="month";
            await Client.db().collection('winners').insertOne(prevarrays[0]);
            await Client.db().collection('rank').updateOne({name:prevarrays[0].name},{$inc:{thirtyday:1,sevenday:0}},{upsert:true});
            
        }
        await Client.db().collection('Monthrank').deleteMany({});
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

    }
    finally{
        
    }
 
    
})



// For resetting the week league


const weekJob=nodeschedule.scheduleJob('0 0 0 * * 7',async()=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');

    try{
        const cursordel=await Client.db().collection('weekrank').find({}).sort({wins:-1}).limit(1).toArray();
        const prevarrays={name:cursordel[0]!=undefined?cursordel[0].name:'-',wins:cursordel[0]!=undefined?cursordel[0].wins:0,time:cursordel[0]!=undefined?cursordel[0].time:'-',type:"week"};
        if(cursordel[0]!=undefined){
            await Client.db().collection('rank').updateOne({name:cursordel[0].name},{$inc:{sevenday:1,thirtyday:0}},{upsert:true});
        }
       
        await Client.db().collection('winners').deleteMany({type:"week"});     
        await Client.db().collection('winners').insertOne(prevarrays);
        await Client.db().collection('weekrank').deleteMany({});
    }
   finally{
    await Client.close();
   }

})

 

