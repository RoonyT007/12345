class Player{
    constructor(id){
        this.id=id;
        this.name="";
        this.img="";
        this.opponent={name:"",img:""};
        this.room="";
        this.wait=2;
        this.count=0;
        this.overRuns=[];
        this.data={};
        this.toss={tossed:false,coin:false,headortails:""};
        this.toss.result="";
        this.toss.choose="";
        this.toss.schoose="";
        this.completed=[];
        this.bat=0;
        this.bowl=0;
        this.tossElgibility;
        this.matchResult="";
    }
}

module.exports=Player;