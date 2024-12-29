class Room{
    constructor(){
        this.roomId=null;
        this.status="";
        this.gameMode=null;
        this.gameType=null;
        this.bot=null;
        this.gameRoomId=null;
        this.run=0;
        this.totalBalls=0;
        this.currentBall=0;
        this.over='0.0';
        this.currentOverRuns=[];
        this.totalWickets=0;
        this.players={};
        this.batting="";
        this.bowling="";
        this.target=0;
        this.CRR="0.0";
        this.RRR="0.0";
        this.tossEligiblePlayer="";
        this.tossResult="";
        this.tossCall="";
        this.tossWon="";
        this.timer='hide';
        this.matchResult=null;
        this.totalInputNeeded=2;
        this.inputRecieved=0;
        this.animationDone=0;
        this.turn=0;   
    }

    setRoomBasedOnGameMode(gameMode,gameType,roomId,gameRoomId){
        this.gameMode=gameMode;
        this.gameType=gameType;
        this.roomId=roomId;
        this.gameRoomId=gameRoomId;
        if(gameMode=="Limitless Block"){
            this.totalBalls=10000;
            this.totalWickets=1;
        }
        else if(gameMode=="2Overs"){
            this.totalBalls=12;
            this.totalWickets=1;
        }
    }
}

module.exports=Room;