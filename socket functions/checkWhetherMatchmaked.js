const { rooms } = require("..");
const { editRoomDataInsideRoomObj, emitDataToRoom } = require("./socketFunctions");

function checkWhetherMatchmaked(roomId){
    if(rooms[roomId]!=undefined && rooms[roomId].status=='match-making'){
        editRoomDataInsideRoomObj(roomId,'bot','initiate');
        emitDataToRoom(roomId);
    }
}

module.exports.checkWhetherMatchmaked=checkWhetherMatchmaked;