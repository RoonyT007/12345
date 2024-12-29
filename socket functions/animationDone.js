const { getRoomDataInsideRoomObj,editRoomDataInsideRoomObj,emitDataToRoom,enablePlayersInsideRoom } = require("./socketFunctions");

function animationDone(roomId,playerName){
    let animationDone=getRoomDataInsideRoomObj(roomId,'animationDone')+1;
    editRoomDataInsideRoomObj(roomId,'animationDone',animationDone);
    if(animationDone==2 && getRoomDataInsideRoomObj(roomId,'matchResult')==null){
        editRoomDataInsideRoomObj(roomId,'inputRecieved',0);
        editRoomDataInsideRoomObj(roomId,'animationDone',0);
        editRoomDataInsideRoomObj(roomId,'timer','8-begin');
        enablePlayersInsideRoom(roomId,playerName);


    }
    emitDataToRoom(roomId);

}

module.exports.animationDone=animationDone;