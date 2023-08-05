const express=require('express');


const tournamentroutes=express.Router();
const mongodb=require('mongodb').MongoClient;

tournamentroutes.get('/:month',async(req,res)=>{
    const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const currentmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    if(req.params.month==="months"){
        const data1=await Client.db().collection('tournament').find({month:currentmonth}).toArray();
        const data=await Client.db().collection('tournament').find().project({month:-1}).sort({time:-1}).toArray();
        await Client.close();
    res.status(200).json({data,data1:data1[0]});
    }
    else if(req.params.month==="current"){
        const data1=await Client.db().collection('tournament').find({month:currentmonth}).toArray();
        await Client.close();
        res.status(200).json(data1[0]);
    }
    else if(req.params.month==="team_available"){
        const data1=await Client.db().collection('tournament').find({month:currentmonth}).toArray();
        await Client.close();
        const filteredData=data1[0].table.filter((e)=>{
            delete e.score;
            if(e.stage!="E"){
                return(e)
            }
        })
        res.status(200).json(filteredData);
    }
    else if(req.params.month==="orange"){
        const data1=await Client.db().collection('tournamentData').find({}).project({runs:1,name:1}).sort({runs:-1}).limit(50).toArray();
        res.status(200).json(data1);
    }
    else if(req.params.month==="purple"){
        const data1=await Client.db().collection('tournamentData').find({}).project({wickets:1,name:1}).sort({wickets:-1}).limit(50).toArray();
        res.status(200).json(data1);
    }
    else{
        const data=await Client.db().collection('tournament').find({month:req.params.month}).toArray();
        await Client.close();
        res.status(200).json(data[0]);
    
    }
    
})

tournamentroutes.post('/contribute',async(req,res)=>{
    if(req.body.data[2]<=200){
        const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const currentmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`;
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    isNaN(Number(req.body.data[1]))==false&& await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,'table.team':req.body.data[0]},{$inc:{'table.$.score':Number(req.body.data[1])}});
    isNaN(Number(req.body.data[2]))==false&&await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth,'table.team':req.body.data[0]},{$inc:{'table.$.runs':Number(req.body.data[2])}});
    
    const check=await Client.db().collection('tournamentData').findOne({name:req.body.data[4]});
    if(check){
        await Client.db().collection('tournamentData').findOneAndUpdate({name:req.body.data[4]},{$inc:{runs:Number(req.body.data[2]),wickets:Number(req.body.data[3])}});
    }
    else{
        await Client.db().collection('tournamentData').insertOne({name:req.body.data[4],runs:Number(req.body.data[2]),wickets:Number(req.body.data[3])}); 
    }
    const orange=await Client.db().collection('tournamentData').find({}).project({runs:1,name:1}).sort({runs:-1}).limit(1).toArray();
    const purple=await Client.db().collection('tournamentData').find({}).project({wickets:1,name:1}).sort({wickets:-1}).limit(1).toArray();
    await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth},{$set:{orange:[orange[0].name,orange[0].runs],purple:[purple[0].name,purple[0].wickets]}});
    await Client.close();
    }
    res.status(201).json({msg:"done"});
    
})

module.exports=tournamentroutes;