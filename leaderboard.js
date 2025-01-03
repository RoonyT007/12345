const express=require('express');


const leaderboardroutes=express.Router();
const mongodb=require('mongodb').MongoClient;




leaderboardroutes.get('/alltime',(req,res)=>{
    mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority').then(async(Client)=>{
        await Client.connect();
        const cursorarray=await Client.db().collection('rank').find({}).sort({thirtyday:-1,sevenday:-1}).toArray();
        res.json({rank:cursorarray,winner:cursorarray[0]===undefined?{name:"TBD"}:cursorarray[0]});
        await Client.close();
    })
});
leaderboardroutes.get('/week',async(req,res)=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    const concursor=await Client.db().collection('weekrank').find({}).sort({wins:-1}).toArray();  
    let prevwinner=await Client.db().collection('winners').find({type:"week"},{_id:0}).toArray();
    prevwinner=prevwinner.length===0?{name:"TBD"}:prevwinner[0];
    res.json({rank:concursor,winner:prevwinner,currentDate:new Date()});
    await Client.close();
        
        
    });

leaderboardroutes.get('/month',(req,res)=>{
   
    mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority').then(async(Client)=>{Client.connect();
        const arrays=await Client.db().collection('Monthrank').find({}).sort({wins:-1}).toArray();
     
        let prevwinner=await Client.db().collection('winners').find({type:"month"},{_id:0}).toArray();

        prevwinner=prevwinner.length===0?{name:"TBD"}:prevwinner[0];
        
        res.json({rank:arrays,winner:prevwinner,currentDate:new Date()});

        await Client.close();

})});



leaderboardroutes.post('/survey',async(req,res)=>{
    try{
        const obj={};
        obj[req.body.selectedOption]=1;
        const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
        await Client.db().collection('survey').updateOne({name:"gamemode"},{$inc:obj},{upsert:true});
        req.body.feedback.length>3&&await Client.db().collection('survey').insertOne({feedback:req.body.feedback});
        await Client.close();
        res.status(201).json({msg:"done"});
    }
   catch(e){
    res.status(401).json({msg:"something went wrong"});
   }
})

module.exports=leaderboardroutes;

