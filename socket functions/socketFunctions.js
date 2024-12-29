

const { emptyRooms, rooms, io, timerObj, friendRooms, playersCanContribute } = require("../index");
const Player = require("../socket class/Player");
const Room = require("../socket class/Room");
const { updateWinsInTournament } = require("./databaseFunctions");



function createRoom(socket,playerName,profileImgName,roomTypeData,gameMode){

    let newRoomId=String(Date.now());
    let newRoomIdLength=newRoomId.length;
    socketJoinRoom(socket,newRoomId);
    
    let newRoom=new Room();

    newRoom.setRoomBasedOnGameMode(gameMode,roomTypeData.roomType,newRoomId,newRoomId.slice((newRoomIdLength-5),newRoomIdLength));
    rooms[newRoomId]=newRoom;
    
    editRoomDataInsideRoomObj(newRoomId,'status','match-making');


    let playerObj=new Player(playerName,socket.id,profileImgName);
    addPlayerDataToRoom(playerObj,newRoomId);

    emitDataToRoom(newRoomId);

    // random / friend
    if(roomTypeData.roomType=='random'){
        emptyRooms[gameMode].push(newRoomId);
    }   
    else if(roomTypeData.roomType=='friend') {
        friendRooms[newRoom.gameRoomId]=newRoomId;
    }
}


function joinRoom(socket,playerName,profileImgName,playerData,gameMode){

    if((emptyRooms[gameMode]!=undefined&&emptyRooms[gameMode].length>0) || playerData.roomType=='friend'){
        let emptyRoomId=undefined;
        if(playerData.roomType=='random'){
        emptyRooms[gameMode].some((roomId,index)=>{
            // code breaking if(rooms[roomId]['players'][playerName]==undefined){
            if(rooms[roomId].bot==null&&rooms[roomId]['players'][playerName]==undefined&&playerData.botRoomId==undefined){
                emptyRoomId=roomId;
                return true;
            }
           
            else if(playerData.botRoomId!=undefined) {
                emptyRoomId=playerData.botRoomId;
                return true;
            }
            // else
        });
    }
    else if(playerData.roomType=='friend'){
        if(friendRooms[playerData.gameRoomId]){
            emptyRoomId=friendRooms[playerData.gameRoomId];
        }
    }
        if(emptyRoomId!=undefined){
            socketJoinRoom(socket,emptyRoomId);

            let playerObj=new Player(playerName,socket.id,profileImgName);
            addPlayerDataToRoom(playerObj,emptyRoomId);
            removeRoomIdFromEmptyRoom(emptyRoomId,gameMode);
            editRoomDataInsideRoomObj(emptyRoomId,'status','Opponent found');
            if(Math.random()>=0.5){
                editRoomDataInsideRoomObj(emptyRoomId,'tossEligiblePlayer',playerName);
            }
            else{
                editRoomDataInsideRoomObj(emptyRoomId,'tossEligiblePlayer',getOpponentName(emptyRoomId,playerName));
            }
 
            // editRoomDataInsideRoomObj(emptyRoomId,'timer',8);
            emitDataToRoom(emptyRoomId);
        }
        else{
            createRoom(socket,playerName,profileImgName,playerData,gameMode);
        }

    }
   
}
function removeRoomIdFromEmptyRoom(roomId, gameMode){
    let index=emptyRooms[gameMode].indexOf(roomId);
    emptyRooms[gameMode].splice(index,1);
}

function addPlayerDataToRoom(playerObj,roomId){
    rooms[roomId].players[playerObj.name]=playerObj;
}


function editPlayerDataInsideRoomObj(roomId,playerName,property,propertyValue){

  rooms[roomId]['players'][playerName][property]=propertyValue

}
function editRoomDataInsideRoomObj(roomId,property,propertyValue){
  rooms[roomId][property]=propertyValue
}
function pushRoomDataInsideRoomObj(roomId,property,propertyValue){


    rooms[roomId][property].push(propertyValue)
  
  }

function enablePlayersInsideRoom(roomId,playerName){
    rooms[roomId]['players'][playerName].disable=false;
    rooms[roomId]['players'][getOpponentName(roomId,playerName)].disable=false;
    return true;
}
function getRoomDataInsideRoomObj(roomId,property){

    try{
        return rooms[roomId][property];
    }
    catch{
        return null;
    }
}
function getPlayerDataInsideRoomObj(roomId,playerName,property){
    return rooms[roomId]['players'][playerName][property];
}

function socketJoinRoom(socket,roomId){
    socket.join(roomId);
    socket.roomId=roomId;
}
function socketLeaveRoom(socket,roomId){
    socket.leave(roomId);
    socket.roomId="";
}
function emitDataToRoom(roomId){

    io.to(roomId).emit('room-data',rooms[roomId]);
}

function disconnectSocketsFromRoom(roomId,action){


    let roomToBeRemoved=rooms[roomId];
    if(roomToBeRemoved!=undefined){
        if(action==='user-disconnected' ){
            editRoomDataInsideRoomObj(roomId,'status','game-aborted')
            emitDataToRoom(roomId);
            io.to(roomId).disconnectSockets(true);
        }


        if(roomToBeRemoved.gameType=='friend') {
           delete friendRooms[roomToBeRemoved.gameRoomId]; 
        }
        else{
            emptyRooms[roomToBeRemoved.gameMode]!=undefined && emptyRooms[roomToBeRemoved.gameMode].splice( emptyRooms[roomToBeRemoved.gameMode].indexOf(roomId),1);

        }
        
        delete rooms[roomId];

    }
    
}


function acknowledgementFunc(socket,forWhat){
    let roomId=socket.roomId;
    rooms[roomId].inputRecieved=rooms[roomId].inputRecieved+1;
    if(rooms[roomId].inputRecieved>=rooms[roomId].totalInputNeeded){
        editRoomDataInsideRoomObj(roomId,'status',forWhat);
        editRoomDataInsideRoomObj(roomId,'timer','8-begin');
        emitDataToRoom(roomId);
        rooms[roomId].inputRecieved=0;
    }
}

function tossFunc(event,socket,additionalAttribute1=null){
    let roomId=socket.roomId;
    let playerName=socket.name;
    let OpponentName=getOpponentName(roomId,playerName);
    if(event==='initiate-toss'){
        editRoomDataInsideRoomObj(roomId,'status','tossed');
        if(Math.random()>=0.5){
            editRoomDataInsideRoomObj(roomId,'tossResult','Heads');
    
        }
        else{
            editRoomDataInsideRoomObj(roomId,'tossResult','Tails');
        }
        editRoomDataInsideRoomObj(roomId,'timer','8-begin');
        

    }
    else if(event=='toss-call'){
        editRoomDataInsideRoomObj(roomId,'tossCall',additionalAttribute1);
        editRoomDataInsideRoomObj(roomId,'status','toss-called');
        editRoomDataInsideRoomObj(roomId,'timer',getRoomDataInsideRoomObj(roomId,'timer')+'');
        // if(getRoomDataInsideRoomObj(roomId,'status')!='toss-animation-done'){
        //     editRoomDataInsideRoomObj(roomId,'status','toss-called');
        // }
        // else{
        //     tossFunc('validate-toss-result',socket)
        // }
        
    }
    else if(event=='validate-toss-result'){
        if(getRoomDataInsideRoomObj(roomId,'tossCall').length>0){
        editRoomDataInsideRoomObj(roomId,'status','toss-result');
        if(getRoomDataInsideRoomObj(roomId,'tossCall')== getRoomDataInsideRoomObj(roomId,'tossResult')){
            editRoomDataInsideRoomObj(roomId,'tossWon',playerName);
        }
        else{
            editRoomDataInsideRoomObj(roomId,'tossWon',OpponentName);
        }

        editRoomDataInsideRoomObj(roomId,'timer','8-begin');
    }
    // else{
    //     editRoomDataInsideRoomObj(roomId,'status','toss-animation-done');
    // }

    }
    else if(event=='toss-choose'){
        editRoomDataInsideRoomObj(roomId,'status','match');
        editRoomDataInsideRoomObj(roomId,'timer','8-begin');
        // editRoomDataInsideRoomObj(roomId,'timer',8);
        if(additionalAttribute1=='Bat'){
            editRoomDataInsideRoomObj(roomId,'batting',playerName);
            editRoomDataInsideRoomObj(roomId,'bowling',OpponentName);
        }
        else{
            editRoomDataInsideRoomObj(roomId,'batting',OpponentName);
            editRoomDataInsideRoomObj(roomId,'bowling',playerName);
        }
        
    }
    else if(event=='emit-run-data'){

        if( getPlayerDataInsideRoomObj(roomId,playerName,'disable')==false){
            
            editRoomDataInsideRoomObj(roomId,'inputRecieved',(getRoomDataInsideRoomObj(roomId,'inputRecieved')+1));
            editPlayerDataInsideRoomObj(roomId,playerName,'input',additionalAttribute1)
            editPlayerDataInsideRoomObj(roomId,playerName,'disable',true)

        }
        
        if(getRoomDataInsideRoomObj(roomId,'inputRecieved')==2){
        
            let batterName=getRoomDataInsideRoomObj(roomId,'batting');
            let batterInput= getPlayerDataInsideRoomObj(roomId,batterName,'input');
            let batterRuns= getPlayerDataInsideRoomObj(roomId,batterName,'runs');

            let bowlerName=getRoomDataInsideRoomObj(roomId,'bowling');
            let bowlerInput= getPlayerDataInsideRoomObj(roomId,bowlerName,'input');
            let bowlerRuns= getPlayerDataInsideRoomObj(roomId,bowlerName,'runs');
         
  
            if(batterInput!=                bowlerInput){
                
                editPlayerDataInsideRoomObj(roomId, batterName,'runs',batterRuns+batterInput);
                batterRuns=batterRuns+batterInput;
                let target= batterRuns-bowlerRuns;
                editRoomDataInsideRoomObj(roomId,'target',target);
                editRoomDataInsideRoomObj(roomId,'run',batterInput);
                pushRoomDataInsideRoomObj(roomId,'currentOverRuns',batterInput);
                editRoomDataInsideRoomObj(roomId,'currentBall',getRoomDataInsideRoomObj(roomId,'currentBall')+1);
                             
            }
            else{
             
                let target= batterRuns-bowlerRuns;
                editRoomDataInsideRoomObj(roomId,'target',target);
                editRoomDataInsideRoomObj(roomId,'run','W');
                pushRoomDataInsideRoomObj(roomId,'currentOverRuns','W');
                editRoomDataInsideRoomObj(roomId,'currentBall',0);
                editPlayerDataInsideRoomObj(roomId, batterName,'wicketLost',getPlayerDataInsideRoomObj(roomId, batterName,'wicketLost')+1)
                editPlayerDataInsideRoomObj(roomId, bowlerName,'wicketTaken',getPlayerDataInsideRoomObj(roomId, bowlerName,'wicketTaken')+1) 
                batterRuns=bowlerRuns=null;
            }
            let currentBall=getRoomDataInsideRoomObj(roomId,'currentBall');

            calculateOverData(roomId,currentBall,batterRuns,bowlerRuns);   
            if(currentBall!=0 && currentBall%6==0){
                editRoomDataInsideRoomObj(roomId,'currentOverRuns',[]);
            }


            // For Switching the turn  (batter and bowler)

            if(getRoomDataInsideRoomObj(roomId,'totalBalls')<=
            getRoomDataInsideRoomObj(roomId,'currentBall') || getRoomDataInsideRoomObj(roomId,'totalWickets')<=getPlayerDataInsideRoomObj(
                roomId, batterName,'wicketLost'
            )){

                switchTurn(roomId,batterName,bowlerName);
                
            }

           
            editRoomDataInsideRoomObj(roomId,'timer','hold');


            // For Match Result
            if(getRoomDataInsideRoomObj(roomId,'turn')==2||(getRoomDataInsideRoomObj(roomId,'turn')==1&&batterRuns>bowlerRuns)){
                let gameType=getRoomDataInsideRoomObj(roomId,'gameType')
              if(getRoomDataInsideRoomObj(roomId,'target')>0){
                editRoomDataInsideRoomObj(roomId,'matchResult',batterName)
               
                if(gameType=='random'){
                    updateWinsInTournament(batterName,1);
                    editPlayerDataInsideRoomObj(roomId,batterName,'eligiblePoints',2)
                }
              }
              else if(getRoomDataInsideRoomObj(roomId,'target')==0){
                editRoomDataInsideRoomObj(roomId,'matchResult','draw')
                if(gameType=='random'){
                editPlayerDataInsideRoomObj(roomId,bowlerName,'eligiblePoints',1)
                editPlayerDataInsideRoomObj(roomId,batterName,'eligiblePoints',1)
                }
              }
              else{
                editRoomDataInsideRoomObj(roomId,'matchResult',bowlerName);
                if(gameType=='random'){
                    updateWinsInTournament(bowlerName,1);
                editPlayerDataInsideRoomObj(roomId,bowlerName,'eligiblePoints',2)
                }
               
              }
              playersCanContribute.push(getPlayerDataInsideRoomObj(roomId,bowlerName,'id'));
              playersCanContribute.push(getPlayerDataInsideRoomObj(roomId,batterName,'id'));
              editRoomDataInsideRoomObj(roomId,'status','match-ended')              
      
              editRoomDataInsideRoomObj(roomId,'timer','hide');
            }
            
 
        }
    }


    emitDataToRoom(roomId);
}


function calculateOverData(roomId,currentBall,batterRuns,bowlerRuns){
    let over=Math.floor(currentBall/6) + '.' +currentBall%6;
    editRoomDataInsideRoomObj(roomId,'over',over);
    let CRR;
    if(currentBall!=0){
        CRR=((batterRuns/currentBall)*6).toFixed(1);
    }
    else{
        CRR='0.0';
    }
    editRoomDataInsideRoomObj(roomId,'CRR',CRR);    
}

function switchTurn(roomId,batterName,bowlerName){
    
    if(getRoomDataInsideRoomObj(roomId,'turn')==0){
        editRoomDataInsideRoomObj(roomId,'batting',bowlerName)
        editRoomDataInsideRoomObj(roomId,'bowling',batterName);
    }
    editRoomDataInsideRoomObj(roomId,'currentOverRuns',[]);


            editRoomDataInsideRoomObj(roomId,'turn',getRoomDataInsideRoomObj(roomId,'turn')+1);

}


function getOpponentName(roomId,playerName){
    try{
        let playersArray= Object.keys(rooms[roomId].players);
        playersArray.splice(playersArray.indexOf(playerName),1);
        return playersArray[0];   
    }
    catch{
        return null
    }
 
}






function timer(){
    Object.keys(rooms).forEach((room)=>{
        if(typeof rooms[room].timer =='string' && rooms[room].timer.includes('begin')){
            rooms[room].timer=Number(rooms[room].timer.split('-')[0]);
            emitDataToRoom(room);
        }
        else if(typeof rooms[room].timer=='number'){
            rooms[room].timer=rooms[room].timer-1;
            if(rooms[room].timer>0){
                emitDataToRoom(room);
            }
            else{
                disconnectSocketsFromRoom(room,'user-disconnected');

                
            }
        }

    })
}

function startTimer(){
    timerObj.timerIntervalFunc=setInterval(timer,1000);
    timerObj.timerOn=true;
}
function stopTimer(){

    clearInterval(timerObj.timerIntervalFunc)
    timerObj.timerOn=false;
}
module.exports.socketJoinRoom=socketJoinRoom;
module.exports.acknowledgementFunc=acknowledgementFunc;
module.exports.tossFunc=tossFunc;
module.exports.socketLeaveRoom=socketLeaveRoom;
module.exports.createRoom=createRoom;
module.exports.joinRoom=joinRoom;
module.exports.startTimer=startTimer;
module.exports.stopTimer=stopTimer;
module.exports.disconnectSocketsFromRoom=disconnectSocketsFromRoom;
module.exports.getRoomDataInsideRoomObj=getRoomDataInsideRoomObj;
module.exports.editRoomDataInsideRoomObj=editRoomDataInsideRoomObj;
module.exports.enablePlayersInsideRoom=enablePlayersInsideRoom;
module.exports.emitDataToRoom=emitDataToRoom;
module.exports.removeRoomIdFromEmptyRoom=removeRoomIdFromEmptyRoom;