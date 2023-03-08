function joinRoom(socket,player){
    for(i=0;i<rooms.length;i++){
        if(players[rooms[i]].length<=1){
            socket.join(rooms[i]);
            players[rooms[i]].push(player.id);
            player.room=rooms[i];
            break;
           }
}
}


module.exports=joinRoom;