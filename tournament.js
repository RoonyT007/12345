const express=require('express');
const { playersCanContribute } = require('./index');


const tournamentroutes=express.Router();
const mongodb=require('mongodb').MongoClient;

tournamentroutes.get('/:month',async(req,res)=>{
    const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const currentmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`
    const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
    if(req.params.month==="months"){
        const data1=await Client.db().collection('tournament').aggregate([
            {$match:{month:currentmonth}},
            {
                $unwind: '$table'
              },
              {
                $sort: { 'table.points':-1,'table.runs':-1}
              }, {
                $group: {
                  _id: '$_id',
                  month:{$first:'$month'},
                  table: {$push: '$table' },
                  orange:{$first:'$orange'},
                  purple:{$first:'$purple'},
                  mot:{$first:'$mot'},
                }
              }
        ]).toArray();
        const data=await Client.db().collection('tournament').find().project({month:-1}).sort({time:-1}).toArray();
        const data2=await Client.db().collection('fixtureOriginal').findOne({});
        await Client.close();
        res.status(200).json({data,data1:data1[0],fixture:data2,currentMonth:currentmonth,currentDate:new Date()});
    }
    else if(req.params.month==="current"){
        const data1=await Client.db().collection('tournament').aggregate([
            {$match:{month:currentmonth}},
            {
                $unwind: '$table'
              },
              {
                $sort: { 'table.points':-1,'table.runs':-1}
              }, {
                $group: {
                  _id: '$_id',
                  month:{$first:'$month'},
                  table: {$push: '$table' },
                  orange:{$first:'$orange'},
                  purple:{$first:'$purple'}
                }
              }
        ]).toArray();
        await Client.close();
        res.status(200).json(data1[0]);
    }
    else if(req.params.month==="team_available"){
        const data1=await Client.db().collection('fixtureOriginal').findOne({});
        // new logic 
        if(data1!=null){
          let indianTime = new Date().toLocaleDateString("en-US", {timeZone: 'Asia/Kolkata'});
          filteredData=data1[indianTime.split('/')[1]>=28?28:indianTime.split('/')[1]];
             await Client.close();
             res.status(200).json(filteredData);
        }
         // new logic  ends remove else block completely and just the if statment
        else{
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

    }
    else if(req.params.month==="orange"){
        const data1=await Client.db().collection('tournamentData').find({}).project({runs:1,name:1}).sort({runs:-1}).limit(50).toArray();
        res.status(200).json(data1);
    }
    else if(req.params.month==="purple"){
        const data1=await Client.db().collection('tournamentData').find({}).project({name:1,wickets:1}).sort({wickets:-1}).limit(50).toArray();
        res.status(200).json(data1);
    }
    else if(req.params.month==="fixtures"){
        const data1=await Client.db().collection('fixtureOriginal').findOne({});
        res.status(200).json(data1);
    }
    else if(req.params.month==="mot"){
        const data1=await Client.db().collection('ManOfTheTournament').find().project({name:1,points:1}).sort({points:-1}).limit(50).toArray();
        res.status(200).json(data1);
    }
    else if(req.params.month==="topContributors1" || req.params.month==="topContributors0"){
        const data1=await Client.db().collection(req.params.month).find({}).project({points:1,name:1}).sort({points:-1}).limit(50).toArray();
        res.status(200).json(data1);
    }
    else if(req.params.month=="playerstats"){
      const data=await Client.db().collection('playerStats').find({}).sort({mot:-1,ocap:-1,pcap:-1,mom:-1}).project({name:1,mot:1,ocap:1,pcap:1,mom:1}).limit(50).toArray();
      await Client.close();
      res.status(200).json(data);
  
  }
    else{
        const data=await Client.db().collection('tournament').find({month:req.params.month}).toArray();
        await Client.close();
        res.status(200).json(data[0]);
    
    }

    
})

tournamentroutes.post('/contribute',async(req,res)=>{
    // console.log(playersCanContribute,req.body);
    if(playersCanContribute.indexOf(req.body.playerId)!=-1){
        if(req.body.data[2]<=200){
            const month=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const currentmonth=`${month[new Date().getMonth()]} - ${new Date().getFullYear()}`;
   
            const Client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/mern?retryWrites=true&w=majority');
            const data1=await Client.db().collection('fixtureOriginal').findOne({});
    
            let indianTime = new Date().toLocaleDateString("en-US", {timeZone: 'Asia/Kolkata'});
            let fixtureDate=indianTime.split('/')[1]>=28?28:indianTime.split('/')[1];
           
      isNaN(Number(req.body.data[1]))==false&& await Client.db().collection('fixtureOriginal').findOneAndUpdate({[fixtureDate+"."+req.body.data[5]]:req.body.data[0]},{$inc:{[fixtureDate+".$."+req.body.data[5]+".1"]:Number(req.body.data[1])}});
      isNaN(Number(req.body.data[2]))==false&& await Client.db().collection('fixtureOriginal').findOneAndUpdate({[fixtureDate+"."+req.body.data[5]]:req.body.data[0]},{$inc:{[fixtureDate+".$."+req.body.data[5]+".2"]:Number(req.body.data[2])}});

        
        
        let contributeWhichDb="topContributors"+req.body.data[6];
        await Client.db().collection('tournamentData').updateOne({name:req.body.data[4]},{$inc:{runs:Number(req.body.data[2]),wickets:Number(req.body.data[3])}},{upsert:true});
        await Client.db().collection(contributeWhichDb).updateOne({name:req.body.data[4]},{$inc:{points:Number((Number(req.body.data[2]/10)+Number(req.body.data[3])).toFixed(1))}},{upsert:true});
        await Client.db().collection('ManOfTheTournament').updateOne({name:req.body.data[4]},{$inc:{points:Number((Number(req.body.data[2]/10)+Number(req.body.data[3])).toFixed(1))}},{upsert:true});
        const mom1=await Client.db().collection(contributeWhichDb).find({}).project({name:1,points:1}).sort({points:-1}).limit(1).toArray();
    
        isNaN(Number(req.body.data[2]))==false&& await Client.db().collection('fixtureOriginal').findOneAndUpdate({[fixtureDate+"."+req.body.data[5]]:req.body.data[0]},{$set:{[fixtureDate+".$."+"mom"]:mom1[0].name + " ("+ mom1[0].points.toFixed(1)+")"}});

        const orange=await Client.db().collection('tournamentData').find({}).project({runs:1,name:1}).sort({runs:-1}).limit(1).toArray();
        const purple=await Client.db().collection('tournamentData').find({}).project({wickets:1,name:1}).sort({wickets:-1}).limit(1).toArray();
        const mot=await Client.db().collection('ManOfTheTournament').find({}).project({points:1,name:1}).sort({points:-1}).limit(1).toArray();
        await Client.db().collection('tournament').findOneAndUpdate({month:currentmonth},{$set:{orange:[orange[0].name,orange[0].runs],purple:[purple[0].name,purple[0].wickets],mot:[mot[0].name,mot[0].points]}});
        await Client.close();
        }
        playersCanContribute.splice(playersCanContribute.indexOf(req.body.playerId),1);
        res.status(201).json({msg:"done"});
    }
    else{
        res.status(400).json({msg:"Invalid Request"});
    }
    
    
})

module.exports=tournamentroutes;