const mongodb=require('mongodb').MongoClient;

const mongoDb={client:'',connection:false};

async function connectToMongoDb(){
    if(!mongoDb.connection){
        mongoDb.client= await mongodb.connect('mongodb+srv://manwithaplan:PRHhihJRqsnuyk5K@cluster0.mqbmipa.mongodb.net/tests?retryWrites=true&w=majority');
        mongoDb.connection=true;
        mongoDb.client.on('connectionClosed',()=>{
            mongoDb.connection=false;
         });

    }
}

async function getMongodbClient(){
    await connectToMongoDb();
    return mongoDb.client;
}

async function updateWinsInTournament(playerName,wins){
    await connectToMongoDb();
    await mongoDb.client.db().collection('weekrank').updateOne({name:playerName},{$inc:{wins}},{upsert:true});
    await mongoDb.client.db().collection('Monthrank').updateOne({name:playerName},{$inc:{wins}},{upsert:true});
}


connectToMongoDb()
module.exports.updateWinsInTournament=updateWinsInTournament;
module.exports.getMongodbClient=getMongodbClient;