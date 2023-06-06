const express=require('express');


const leaderboardroutes=express.Router();
const mongodb=require('mongodb').MongoClient;




leaderboardroutes.get('/alltime',(req,res)=>{
    mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority').then(async(Client)=>{
        await Client.connect();
        const cursor=await Client.db().collection('rank').find({}).sort({score:-1});
        const cursorarray=await cursor.toArray();
        res.json({rank:cursorarray,winner:cursorarray[0]===undefined?{name:"TBD"}:cursorarray[0]});
        if(cursorarray[99]!==undefined){
            await Client.db().collection('rank').deleteMany({score:{$lt:cursorarray[99].score}}) ;
            await Client.close();
           }
            else{
                await Client.close();
            }
    })
});
leaderboardroutes.get('/week',async(req,res)=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    const cursor=await Client.db().collection('weekrank').find({}).sort({score:-1});  
    const concursor=await cursor.toArray();  
    const cursor2=await Client.db().collection('winners').find({type:"week"},{_id:0});
    var prevwinner=await cursor2.toArray();
    prevwinner=prevwinner.length===0?{name:"TBD"}:prevwinner[0];

    

    
       await res.json({rank:concursor,winner:prevwinner});
       if(concursor[29]!==undefined){
        await Client.db().collection('weekrank').deleteMany({score:{$lt:concursor[29].score}}) ;
        await Client.close();
       }
        else{
            await Client.close();
        }
        
        
    });

leaderboardroutes.get('/month',(req,res)=>{
    const today=new Date();
const monthVer=Number(""+today.getFullYear()+(today.getMonth()/2));
    mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority').then(async(Client)=>{Client.connect();
        const cursor=await Client.db().collection('Monthrank').find({}).sort({score:-1});
        const arrays=await cursor.toArray();
        const prevcursor=await Client.db().collection('Monthrank').find({time:{$lt:monthVer}}).sort({score:-1}).limit(1);
        const prevarrays=await prevcursor.toArray();
        if(prevarrays.length>=1){
            await Client.db().collection('winners').deleteMany({type:"month"});
            prevarrays[0].type="month";
            await Client.db().collection('winners').insertOne(prevarrays[0]);
        }
        const cursor2=await Client.db().collection('winners').find({type:"month"},{_id:0});
        var prevwinner=await cursor2.toArray();
        prevwinner=prevwinner.length===0?{name:"TBD"}:prevwinner[0];
        await Client.db().collection('Monthrank').deleteMany({time:{$lt:monthVer}});
        res.json({rank:arrays,winner:prevwinner});

        if(arrays[49]!==undefined){
            await Client.db().collection('Monthrank').deleteMany({score:{$lt:arrays[49].score}}) ;
            await Client.close();
           }
            else{
                await Client.close();
            }

})});


leaderboardroutes.post('/contribute',async(req,res)=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    const cursor=await Client.db().collection('WTC');
    const cursor_1=await cursor.findOne({country:req.body.data[0]});
    await cursor.findOneAndUpdate({country:req.body.data[0]},{$set:{score:cursor_1.score+Number(req.body.data[1])}});
    await Client.close();
    res.status(201).json({msg:"done"});
})
leaderboardroutes.get('/contribute',async(req,res)=>{
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    const cursor=await Client.db().collection('WTC').find({}).sort({score:-1});
    const data=await cursor.toArray()
    await Client.close();
    res.status(200).json({data});
})
module.exports=leaderboardroutes;

