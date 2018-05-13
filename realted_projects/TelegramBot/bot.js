let async = require('async');
let colors = require('colors'); // Probablly Just For Developing
let ups = require('../../UsPs');
let consV = require('../../constantVars');
let pandoc = require('node-pandoc');
const pup = require('puppeteer');

let mongodb = require('mongodb');
let ObjectID = require('mongodb').ObjectID;
let mongoClient = mongodb.MongoClient;
let db;

let Tbot = require('node-telegram-bot-api');
bot = new Tbot('492365773:AAEKRRYEwvE.....', {pulling: true});

let redis = require('redis');
let client = redis.createClient();
client.select(3);
client.on('error' , function (err)
{
	console.error(new Error(`#Error. message: ${err}`.red));
	try
	{
		client.quit();
	} catch (error) {
		
	}
	try
	{
		db.close();	
	} catch (error) {
		
	}
});

db_connect();

function startBot()
{
	let firstArt = null;
	let firstArtId = null;
	let firstArtColl = null;
	let firstArtUrl = null;
	let firstArtRes = null;
	let redisKeys = [];	
	let redisValues = [];
	async.series
	([
		function (callback)
		{
			client.keys('*' , function (err , keys)
			{
				redisKeys = keys;
				if(keys.length !=0)
				{
					client.mget(keys , function (err , values)
					{
						redisValues = values;
						callback(null);
					});
				}
				else
				{
					callback(null);
				}
			});
		},
		function (callback)
		{
			let collection = db.collection('social_media');			
			collection.findOne( { "_id" : 'non_arts' } , function(err , node)
			{
				if(err)
				{
					console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
				}
				else if(node == null)
				{
					console.log("#Mongo. Can not find node document".yellow);
				}
				redisValues = redisValues.concat(node.list);
				for(let i = 0 ; i < redisValues.length ; i++)
				{
					redisValues[i] = new ObjectID (redisValues[i]);
				}
				callback(null);
			});
		},
		function (callback)
		{
			async.forEachOf(consV.database.enc.EncsColls , function(el , index , asfcallback)
			{
				let collection = db.collection(el);
				collection.find
				({
					'_id':
					{
						$nin: redisValues,
					}
				})
				.toArray(function(err , arts)
				{
					if(err)
					{
						console.error(new Error(`#Error. message: ${err}`.red));				
						return asfcallback(err);
					}
					else if(arts.length != 0)
					{
						firstArt = arts[0];
						firstArtId = firstArt._id;
						firstArtColl = el;
						asfcallback(null);
					}
					else
					{
						asfcallback(null);
					}
				});
			},
			function (err)
			{
				if(err)
				{
					console.error( new Error(`#Error. message: ${err}`.red) );
				}
				callback(null);
			});
		},
		function (callback)
		{
			if(firstArt == null)
			{
				for(let i = 0 ; i < redisKeys.length ; i++)
				{
					redisKeys[i] = new Date(redisKeys[i]);
				}				
				let minDate = new Date(Math.min.apply(null , redisKeys)); 
				client.get(minDate.toString() , function (err , value)
				{
					firstArtId = value;
					client.del(minDate.toString() , function (err , res)
					{
						callback(null);
					});
				});
			}
			else
			{
				callback(null);
			}
		},
		function (callback)
		{	
			if(firstArt == null)
			{
				node_coll_by_Id(firstArtId, function (err, coll)
				{
					firstArtColl = coll;
					firstArtId = new ObjectID (firstArtId);
					nodeInfNoObjWColl(firstArtId, firstArtColl, function (err, node)
					{
						firstArt = node;
						callback(null);
					});
				});
			}
			else
			{
				callback(null);
			}
		},
		function (callback)
		{
			//------------ Algorithm ------------//
			url_by_NodeId(firstArt._id , firstArtColl , function (err, url)
			{
				firstArtUrl = url;
				callback(null);				
			});
			//------------ Algorithm ------------//
		},
		function (callback)
		{
			article_resources_WUsersAResInfo(firstArtId, firstArtColl, function(err , res)
			{
				if(err || res == null)
				{
					console.error( new Error(`#Error. message: ${err}`.red) );
					callback(consV.codes.db.Error.toString());
				}
				else
				{
					firstArtRes = res;
					callback(null , res);
				}
			});
		},
		function (callback)
		{
			try
			{
				(async() =>
				{
					const browser = await pup.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
					const page = await browser.newPage();
					await page.setViewport({width:761, height: 800});
					await page.goto(firstArtUrl + '#education_article');
					await page.addStyleTag({path: __dirname + '/css.css'});				
					await page.screenshot({path: __dirname + '/pic.png'});
					await browser.close();
					bot.sendPhoto("@healight", __dirname + '/pic.png', {caption: 'ادامه مقاله رو در سایت بخوانید. لینک مقاله:' + firstArtUrl})
					.then(function (fulfilled)
					{
						callback(null);					
					})
					.catch(function (error)
					{
						callback(null);					
					});
				})();
			}
			catch (error)
			{
				callback(null);					
			}
		},
		function (callback)
		{
			const options =
			{
				parse_mode: 'markdown'
			}
			let FAText = firstArt.content.fa;			
			FAText = FAText.replace(/\<img/g , 'SEXRECTSTART');
			FAText = FAText.replace( /SEXRECTSTART(.*)\>/gim , '');
			pandoc(FAText , '-f html -t commonmark' , function (err, res)
			{
				res = '📒 ' + firstArt.treeTitle.fa + '\n\n' + res;
				res = res.replace('\n\n\n\n' , '\n\n\n');
				res = res.replace('\n\n\n' , '\n\n');
				res = res.replace(/\n[\s]*\n[\s]*\n[\s]*/gim , '\n\n');
				res = res.replace('\\\n' , '');
				res = res.replace('![](' , 'SEXRECTSTART');
				let pattern = /SEXRECTSTART(.*)\)/gim;					
				res = res.replace(pattern , '');
				res = res.substr(0,1000);
				res = res + ` \\[[ادامه ی مقاله](${firstArtUrl})\]\n\n`;
				if (Object.keys(firstArtRes[0]).length != 0 )
				{
					res = res + '\n📋' + 'منابع' + '\n';
					for(var key in firstArtRes[0])
					{
						res = res + '- ' + firstArtRes[2][key].name['fa'] + ' ' + firstArtRes[2][key].family['fa'] + '\n';
					}
				}
				res = res + `[برای مطالعه ی کامل مقاله اینجا کلیک کنید.](${firstArtUrl})`;
				FAText = res;		
				bot.sendMessage("@healight", FAText, options);	
				client.set( new Date() , firstArt._id.valueOf().toString() );		
				callback(null);
			});
		}
	],
	function (err, results)
	{
		if(err)
		{
			console.error( new Error("#error: ".red + err) );
		}
		client.quit();
		db.close();	
		console.log("#Done :)".green);		
	});
}

function db_connect()
{
	let dbName = 'health';
	let mongo_server_address = 'localhost:27017/' + dbName;
	let url = 'mongodb://'+ ups.mongo_username + ':' + ups.mongo_password + '@' + mongo_server_address;
	
	mongoClient.connect(url , function(err , DbConn)
	{
		if(err)
		{
			console.error( new Error(`#Mongo #FIXME. Cannot connect to mongodb. message: ${err}`.red) );
		}
		else
		{
			console.log("#Mongo. Successfully connected to mongodb".green);
			db = DbConn;
			startBot();
		}
	});
}

function url_by_NodeId(node_id , collection , cbf)
{
	let coll = db.collection(collection);
	let callbackCalled = false;
	let url = [];

	let i = 0;
	let FC_counter = 1;
	
	function rec(node_id)
	{
		coll.findOne( {"_id" : node_id} , function(err , node)
		{
			if(err)
			{
				console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
				if(callbackCalled == false)
				{
					callbackCalled = true;
					cbf(err, null);
				}
			}
			else if(node == null)
			{
				console.log( new Error( "#Mongo. #url_by_NodeId function. Can not find node document") );
			}
			else if(node)
			{
				url.push(node.URLName);
				
				if(node._id.valueOf().toString() != root_id_by_coll_name(collection))
				{
					FC_counter++;
					rec(node.parent);
				}
			}
			FC_counter--;
			if(FC_counter == 0 && callbackCalled == false)
			{
				callbackCalled = true;
				url.push('https://' + consV.host.domain + '/fa' + '/encyclopedia');
				url.reverse();
				url = url.join('/');
				cbf(null, url);
			}
		});
	}
	rec(node_id);
}

function article_resources_WUsersAResInfo(nodeId, nodeEnc, cbf)
{
	let collection = db.collection(nodeEnc);
	collection.findOne( { "_id" : nodeId } , function(err , art)
	{
		if(err)
		{
			console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
		}
		let users = {};
		async.forEachOf(art.resources , function(value , key , callB)
		{
			async.forEachOf(value.content_user , function(v , k , callback)
			{
				nodeInfCObj(k, function(err , user)
				{
					if(err)
					{
						return callback(err);
					}
					else if(user == null)
					{
						console.error( new Error(`#article. #article_resources_WUsersAResInfo function. user not found. message: ${err}`.red) );	
					}
					else
					{
						let Muser = {};
						Muser.email = user.email;
						Muser.name = user.name;
						Muser.family = user.family;
						users[k] = Muser;
					}
					callback(null);
				});
			},
			function (err)
			{
				if(err)
				{
					console.error( new Error(`#article. #article_approves function. message: ${err}`.red) );
				}
				callB(err);
			});
		},
		function (err)
		{
			if(err)
			{
				console.error( new Error(`#article. #article_approves function. message: ${err}`.red) );
			}
			resources(function(err, res)
			{
				cbf(err, [art.resources, users, res]);
			});
		});
	});
}
function node_coll_by_Id(nodeId, cbf)
{	
	let node_id = null;
	node_id = new ObjectID (nodeId);
	let coll = null;
	async.forEachOf(consV.database.allColls , function(el , index , callback)
	{
		let collection = db.collection(el);
		collection.findOne( { "_id" : node_id } , function(err , art)
		{
			if(err)
			{
				return callback(err);
			}
			else if(art)
			{
				coll = consV.database.allColls[index];
			}
			callback(null);
		});
	},
	function (err)
	{
		if(err)
		{
			console.error( new Error("#Error: ".red + err) );
		}
		else if(coll == null)
		{
			console.error( new Error("#could not found art collection: %s".red, err) );
		}
		cbf(err, coll);
	});
}

function nodeInfCObj(nodeId, cbf)
{
	node_coll_by_Id(nodeId , function(err, coll)
	{
		if(err)
		{
			return cbf(err);			
		}
		else if(coll == null)
		{
			cbf(null, null);
			return;
		}
		let collection = db.collection(coll);
		let node_id = new ObjectID (nodeId);

		collection.findOne( { "_id" : node_id } , function(err , nod)
		{
			if(err)
			{
				console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
			}
			else if(nod == null)
			{
				console.log("#Mongo. Can not find node document".yellow);
			}
			cbf(err, nod);
		});
	});
}

function nodeInfNoObjWColl(node_id, coll, cbf)
{
	let collection = db.collection(coll);

	collection.findOne( { "_id" : node_id } , function(err , node)
	{
		if(err)
		{
			console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
		}
		else if(node == null)
		{
			console.log("#Mongo. Can not find node document".yellow);
		}
		cbf(err, node);
	});
}

function resources(cbf)
{
	let collection = db.collection('site');
	collection.findOne( { "_id" : 'resources' } , function(err , resources)
	{
		if(err)
		{
			console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
		}
		delete resources._id;
		cbf(err, resources);
	});
}

function root_id_by_coll_name(coll_name)
{
	let res = null;
	Object.keys(consV.database.enc).forEach(element => {
		if(typeof consV.database.enc[element].CollName != 'undefined' && consV.database.enc[element].CollName == coll_name)
		{
			res = consV.database.enc[element].rootObjId.valueOf().toString();
		}
	});
	return res;
}
