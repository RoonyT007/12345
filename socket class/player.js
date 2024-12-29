class Player{
    constructor(playerName,socketId,profileImgName){
        this.name=playerName;
        this.id=socketId;
        this.profileImgName=profileImgName;
        this.eligiblePoints=0;
        this.runs=0;
        this.fours=0;
        this.sixs=0;
        this.wicketTaken=0;
        this.wicketLost=0;
        this.input=null;
        this.disable=false;
       
        
    }
}

module.exports=Player;