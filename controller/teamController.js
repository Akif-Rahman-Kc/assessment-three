const coll = require('../config/connection')
const DB_COLLECTION_NAME = "demo-akif";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = {
    addTeam: async (req, res) =>{
        try {
            const { teamName, players, captain, viceCaptain } = req.body
            if (players.length === 11) {
                const result = players.map((player) => {
                    if (players[1].Team !== player.Team) {
                        return true
                    }
                })
                if (result) {
                    const counts = {};
                    for (let i = 0; i < players.length; i++) {
                        counts[players[i].Role] = counts[players[i].Role] ? counts[players[i].Role] + 1 : 1;
                    }
                    if (counts.BATTER <= 8 && counts.ALLROUNDER <= 8 && counts.WICKETKEEPER <= 8 && counts.BOWLER  <= 8 && counts.BATTER >= 1 && counts.ALLROUNDER >= 1 && counts.WICKETKEEPER >= 1 && counts.BOWLER >= 1) {
                        const db = await coll.connect()
                        const my_team = await db.collection(DB_COLLECTION_NAME).insertOne(req.body);
                        res.status(200).json({status:"Success",message:"Successfully add Team"});
                    }else{
                        if (counts.BATTER > 8) {
                            res.status(200).json({status:"Failed",message:"Maximum 8 Batter Only"});
                        } else if (counts.ALLROUNDER > 8) {
                            res.status(200).json({status:"Failed",message:"Maximum 8 All Rounder Only"});
                        } else if (counts.WICKETKEEPER > 8) {
                            res.status(200).json({status:"Failed",message:"Maximum 8 Wicket Keeper Only"});
                        } else if (counts.BOWLER > 8) {
                            res.status(200).json({status:"Failed",message:"Maximum 8 Bwoler Only"});
                        } else if (counts.BATTER  == undefined) {
                            res.status(200).json({status:"Failed",message:"Please Select Minimum 1 Batter"});
                        } else if (counts.ALLROUNDER  == undefined) {
                            res.status(200).json({status:"Failed",message:"Please Select Minimum 1 All Rounder"});
                        } else if (counts.WICKETKEEPER  == undefined) {
                            res.status(200).json({status:"Failed",message:"Please Select Minimum 1 Wicket Keeper"});
                        } else if (counts.BOWLER == undefined) {
                            res.status(200).json({status:"Failed",message:"Please Select Minimum 1 Bwoler"});
                        }
                    }
                }
            }else{
                res.status(200).json({status:"Failed",message:"Must have 11 players"});
            }
        } catch (error) {
            console.log(error)
        }
    },
    processResult: async (req, res) =>{
        try {
            const { batter, bowler, batsman_run, overs, ballnumber, isWicketDelivery, kind, fielders_involved, player_out } = req.body;
            const db = await coll.connect()
            if (overs === 0 && ballnumber === 1) {
                await db.collection(DB_COLLECTION_NAME).updateMany({},{
                    $set: {
                        'players.$[].TotalRun': 0,
                        'players.$[].TotalPoint': 0,
                        'players.$[].TotalWickets': 0,
                        'players.$[].TotalCatches': 0,
                        'players.$[].Out': false,
                      }
                })
            }

            //Batter Points
            const batterResult = await db.collection(DB_COLLECTION_NAME).findOne({ 'players.Player': batter });
            let totalRun = await batterResult.players.find(player => player.Player === batter).TotalRun;
            totalRun = totalRun + batsman_run
            let batterPoint = await batterResult.players.find(player => player.Player === batter).TotalPoint;
            batterPoint += batsman_run
            batsman_run === 4 || batsman_run === 6 && batterPoint + 1
            batsman_run === 6 && batterPoint + 2
            if (player_out === batter) {
                await db.collection(DB_COLLECTION_NAME).updateMany({players: {
                    $elemMatch: {
                      Player: batter
                    }}},{
                    $set: {
                        'players.$.Out': true ,
                      }
                })
            }
            await db.collection(DB_COLLECTION_NAME).updateMany({players: {
                $elemMatch: {
                  Player: batter
                }}},{
                $set: {
                    'players.$.TotalRun': totalRun ,
                    'players.$.TotalPoint': batterPoint ,
                  }
            })
            
            //Bowler Points
            const bowlerResult = await db.collection(DB_COLLECTION_NAME).findOne({ 'players.Player': bowler });
            let bowlerPoint = await bowlerResult.players.find(player => player.Player === bowler).TotalPoint;
            kind === "lbw" || kind === "bowled" && bowlerPoint + 8
            if (isWicketDelivery !== 0 && kind !== "runout") {
                let totalWickets = await bowlerResult.players.find(player => player.Player === bowler).TotalWickets;
                totalWickets = totalWickets + isWicketDelivery
                bowlerPoint += 25
                await db.collection(DB_COLLECTION_NAME).updateMany({players: {
                    $elemMatch: {
                    Player: bowler
                    }}},{
                    $set: {
                        'players.$.TotalWickets': totalWickets ,
                        'players.$.TotalPoint': bowlerPoint ,
                    }
                })
            }

            //Fielder Points
            if (isWicketDelivery !== 0 && kind !=="bowled" ) {
                const fielderResult = await db.collection(DB_COLLECTION_NAME).findOne({ 'players.Player': fielders_involved });
                let totalCatches = await fielderResult.players.find(player => player.Player === fielders_involved).TotalCatches;
                totalCatches = totalCatches + isWicketDelivery
                let fielderPoint = await fielderResult.players.find(player => player.Player === fielders_involved).TotalPoint;
                if (kind === "caught") {
                    fielderPoint += 8
                }
                if (kind === "runout") {
                    fielderPoint += 6
                }
                if (kind === "stumping") {
                    fielderPoint += 12
                }
                await db.collection(DB_COLLECTION_NAME).updateMany({players: {
                    $elemMatch: {
                    Player: fielders_involved
                    }}},{
                    $set: {
                        'players.$.TotalCatches': totalCatches ,
                        'players.$.TotalPoint': fielderPoint ,
                    }
                })
            }

            //After an innings
            if (overs === 19 && ballnumber === 6) {
                const db = await coll.connect()
                const teams = await db.collection(DB_COLLECTION_NAME).find().toArray()
                teams.forEach(async (team) => {
                    let teamTotalPoint = 0
                    for (let i = 0; i < team.players.length; i++) {
                        let totalPoint = 0
                        if (team.players[i].TotalRun >= 30 && team.players[i].TotalRun < 50) {
                            totalPoint += 4
                        }
                        if (team.players[i].TotalRun >= 50 && team.players[i].TotalRun < 100) {
                            totalPoint += 8
                        }
                        if (team.players[i].TotalRun >= 100) {
                            totalPoint += 16
                        }
                        if (team.players[i].TotalRun === 0 && team.players[i].Out === true && team.players[i].Role !== "BOWLER") {
                            totalPoint -= 2
                        }
                        if (team.players[i].TotalWickets === 3) {
                            totalPoint += 4
                        }
                        if (team.players[i].TotalWickets === 4) {
                            totalPoint += 8
                        }
                        if (team.players[i].TotalWickets >= 5) {
                            totalPoint += 16
                        }
                        if (team.players[i].TotalCatches >= 3) {
                            totalPoint += 4
                        }
                        totalPoint += team.players[i].TotalPoint
                        await db.collection(DB_COLLECTION_NAME).updateMany({players: {
                            $elemMatch: {
                            Player: team.players[i].Player
                            }}},{
                            $set: {
                                'players.$.TotalPoint': totalPoint ,
                            }
                        })
                        teamTotalPoint += totalPoint
                    }
                    await db.collection(DB_COLLECTION_NAME).updateOne({teamName:team.teamName},{
                        $set: {
                            TeamTotalPoint: teamTotalPoint ,
                        }
                    })
                })
            }
            await db.collection("matches").insertOne(req.body);
            res.status(200).json({status:"Success",message:"Successfully Processing Result}"});
        } catch (error) {
            console.log(error)
        }
    },
    teamResult: async (req, res) =>{
        try {
            const db = await coll.connect()
            const allTeams = await db.collection(DB_COLLECTION_NAME).find().sort({TeamTotalPoint: -1}).toArray()
            allTeams.forEach(async (team) => {
                console.log(`Team Name : ${team.teamName}`);
                console.log("Players :\n");
                team.players.forEach((player) => {
                    console.log(player.Player + " - " + player.TotalPoint);
                })
            })
            console.log("Winners : " + allTeams[0].teamName);
            res.status(200).json({status:"Success",message:"Successfully Get All teams",data:allTeams,winners:allTeams[0].teamName});
        } catch (error) {
            console.log(error)
        }
    },
}