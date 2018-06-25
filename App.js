// Scott lindh
// Account managment for coin daemons without inbuilt acocunting
// info@merkle.group
// http://merkle.group
//
//

var coind = require('coind-client');
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

const url = '';
const dbName = 'btcp-accouting';
var dbCollection = "accounts"; 
var telegramBotToken = ""; //name: btcp_wallet_bot  url: t.me/btcp_wallet_bot

//telegram
const TeleBot = require('telebot'); // The libary we use to interact with telegram


var coindaimon = new coind.Client({
  host: '',
  port: 3333,
  user: 'xxxx1234',
  pass: '1234xxx'
});

var helpText = "Welcome to the BTCP wallet, you can use most standard commands here, for example; Try /balance /send , etc, etc"
var blockExploreUrl = "https://explorer.btcprivate.org/";

//BOT CODE
//////////////
const bot = new TeleBot(telegramBotToken); 

bot.on('text', function(msg){
    console.log(msg.chat.id + " " + msg.chat + ": " + msg.text);
}) 



// Gives users link to block explorer
bot.on('/explore', function(msg){
    console.log(msg.chat.id);
    msg.reply.text(blockExploreUrl);
}); //

// Help Command see helpText varible
bot.on(['/help', '/start', '/wiki', '/about', '/consolerules'], function(msg){ 
        //console.log(msg.chat.id);
        msg.reply.text(helpText);
});

// create new account
bot.on('/newAccount', function(msg){
    var uniqueID = msg.from.id;
    console.log("new: " + uniqueID);
    createAccount(uniqueID, function(d){
        if(d.success){
            //console.log(d.data);
            msg.reply.text(d.data.address);
        }else{
            //console.log(d.error);
            msg.reply.text(d.response);
        }
     });
}); //

// create account address if user has one
bot.on('/address', function(msg){
    var uniqueID = msg.from.id;

    depositAddress(uniqueID, function(d){
        if(d.success){
            msg.reply.text(d.address);
        }else{
            msg.reply.text(d.error);
        }    
    });    
}); //

// checks accounts balance
bot.on('/balance', function(msg){
    var uniqueID = msg.from.id;
    balance(uniqueID, function(d){
        if(d.success){
            msg.reply.text(d.balance);
        }else{
            msg.reply.text(d.error);
            //msg.reply.text("Do you even have a account yet? try /newAccount or /help");
        }    
    });   
}); //

//withdraw
bot.on('/withdraw', function(msg){
    msg.reply.text("Use /send please ...");   
    msg.reply.text("send <amount> <to>, ie: /send 1 b1EhT7hxg28K7dV2jYL3TREexMTDQC4g9cd"); 
    
}); //

// Send command, send amount to address if balance allows
bot.on(/^\/send (.+)$/, (msg, props) => {
    var uniqueID = msg.from.id;
    if(props != null){
        const command = props.match[1];
        var params = command.split(" ");
        var amount = params[0];
        var to = params[1];
        send(uniqueID, to, amount, function(d){
            if(d.success){
                msg.reply.text(blockExploreUrl + "/tx/" + d.tx);
            }else{
                msg.reply.text(d.error);
            }    
        });     
        
    }else{
        msg.reply.text("Please use correct syntax, /send <amount> <to>, ie: /send 1 b1EhT7hxg28K7dV2jYL3TREexMTDQC4g9cd");
    }

    //return bot.sendMessage(msg.from.id, text, { replyToMessage: msg.message_id });
});

bot.on(['error'], msg => {
    console.log(msg);
    //email / message / notify owner
    //botsOwnerEmail
  });

//brands every text going out with our bots brand / image
//bot.mod('text', (data) => {
//    let msg = data.message;
//    msg.text =  botBrand + " " + msg.text;
//    return data;
//});

// Fun easter egg
bot.on('cats suck', (msg) => {
   return msg.reply.photo('http://thecatapi.com/api/images/get');
});

bot.start();
//////////////
//END BOT CODE


//ACCOUNT MANAGMENT CODE
/*
coindaimon.cmd('getbalance',"", function(err, info) {
    if(err){
        console.log(err);
    }else{
        console.log(info);
    }   
  });
*/

/*
createAccount("test", function(d){
    if(d.success){
        console.log(d.data);
    }else{
        console.log(d.error);
    }
 });
*/

function createAccount(user, callback){
    //check if user exists
    MongoClient.connect(url, function(err, client) {        
        if(err){
            return callback({success:false, error:err})
        }else{
                //console.log("Connected successfully to DB..");
                // Get the documents collection
                const db = client.db(dbName);
                const collection = db.collection(dbCollection);
                collection.find({'user':user}).toArray(function(err, docs) {
                  //documents found
                  if(err){
                    //console.log(err);
                    return callback({success:false, error:err});
                  }else{

                        try{
                            //console.log(docs);
                            //console.log("trying to find account....");

                            docs.forEach(element => {
                                if(element.user == user){
                                    //console.log("user found");  
                                    return callback({success:true, data:element});                                  
                                }else{
                                    //console.log("nope");
                                }
                            });
                            //console.log("No account found....");
                            throw Error('no account');
                        }catch(x){
                            //console.log(x);
                            //console.log("no user found");
                            //console.log("creating new address, for new user");
                            coindaimon.cmd('getnewaddress', "", function(err, address) {
                           
                            if(err){
                                //console.log(err)
                                if(err.indexOf("403") !== -1){
                                    return callback({success:false, error:"403 Forbidden"});
                                }
                                return callback({success:false, error:err});
                            }else{     
                                 const collection = db.collection(dbCollection);
                                 // Insert some documents
                                 collection.insertMany([
                                      {'user' : user, 'address':address, 'spent':0}
                                 ], function(err, result) {
                                      //console.log("Created new account");
                                      client.close();
                                      if(err){
                                        return callback({success:false, err:err});
                                      }
                                      return callback({success:true, data:result});
                                  });
                                }
                            //

                        });                                            
                      }
                  }
                });
                //no documents found
                //console.log("");                
              }    
      });    
}

/*
depositAddress("scott", function(d){
    if(d.success){
      console.log(d.address);
    }else{
      console.log(d.error);
    }    
});
*/
function depositAddress(user, callback){
    createAccount(user, function(d){
        if(d.success){
          return callback({success:true, address:d.data.address});
        }else{
          return callback({success:false, data:d.error});
        }        
    });
}

/*
send("scott", "b1EaUGN5vcBzWmVLo35pNypP8bYWdZCXk1R", 0.1, function(d){
    if(d.success){
      console.log(d.tx);
    }else{
      console.log(d.error);
    }    
});
*/
function send(user, address, amount, callback){ //send/withdraw
    //check balance first
    balance(user, function(d){
        if(d.success){
          console.log(d.balance);
          if(d.balance > amount){
            //user has enough to send
            //send
            coindaimon.cmd('sendtoaddress', address, amount, function(err, tx) {
                if(err){
                    //console.log(err);
                    return callback({success:false, error:err});
                }else{
                    //console.log(info);

                    //Lets Mark account spent 
                    addSpent(user, amount, function(d){
                        if(d.success){
                          //console.log(d.message);
                          //SUCCESS RETURN TRANSACTION
                          return callback({success:true, tx:tx});
                        }else{
                          console.log(d.error);
                          return callback({success:false, error:d.error});

                        }    
                    });


                }   
              });
          }else{
            //user don't have enough coins to send
            return callback({success:false, error:"Not enough balance to send."});
          }

        }else{
          console.log(d.error);
        }    
    });
}

/*
balance("test", function(d){
    if(d.success){
      console.log(d.balance);
    }else{
      console.log(d.error);
    }    
});
*/
function balance(user, callback){
    createAccount(user, function(d){
        if(d.success){
          // got spent in d.data.spent, lets get addressbalance now
          coindaimon.cmd('getreceivedbyaddress', d.data.address, 1, function(err, bal) {
            if(err){
                //console.log(err);
                return callback({success:false, error:err});
            }else{
                //console.log(info);
                var finalBalance = bal - d.data.spent;
                return callback({success:true, balance:finalBalance});
            }   
          });

          //listunspent
          //sendtoaddress
          //getbalance
          //getreceivedbyaddress
          
        }else{
          return callback({success:false, data:d.error});
        }        
    });
}

/*
getSpent("scott", function(d){
    if(d.success){
      console.log(d.spent);
    }else{
      console.log(d.error);
    }    
});
*/
function getSpent(user, callback){
    createAccount(user, function(d){
        if(d.success){
          return callback({success:true, spent:d.data.spent});
        }else{
          return callback({success:false, error:d.error});
        }
        
    });
}

/*
addSpent("scott", 0.1, function(d){
    if(d.success){
      console.log(d.message);
    }else{
      console.log(d.error);
    }    
});
*/
function addSpent(user, amount, callback){
    getSpent("scott", function(d){
        if(d.success){
          var originalSpent = d.spent;
          MongoClient.connect(url, function(err, client) { 
            const db = client.db(dbName);
            const collection = db.collection(dbCollection);
            // Update document where user is user, set spent equal to amount

            var newSpent = parseFloat(originalSpent) + parseFloat(amount);

            collection.updateOne({ user : user }
            , { $set: { spent : parseFloat(newSpent).toFixed(5) } }, function(err, result) {
                //console.log("Updated the document ...");
                if(err){
                    return callback({success:false, error:err});
                }else{
                    return callback({success:true, message:"Spent has been updated"});
                }                
                //callback(result);
            }); 
            client.close();   
        });
        }else{
          console.log(d.error);
        }    
    });
}

  //deposit
  //withdraw


