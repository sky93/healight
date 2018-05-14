let colors = require('colors');
let ups = require('../../UsPs');
let consV = require('../../constantVars');
let request = require('request');
let medium = require('medium-sdk');
let mongodb = require('mongodb');
let ObjectID = require('mongodb').ObjectID;

let mongoClient = mongodb.MongoClient;
let db;
let DbConn;

// let client = new medium.MediumClient
// ({
//   clientId: ups.medium.clientId,
//   clientSecret: ups.medium.clientSecret
// });
// let redirectUrl = ups.medium.redirectUrl;

// let AuthorizationUrl = client.getAuthorizationUrl('secretState' , redirectUrl,
// [medium.Scope.BASIC_PROFILE, medium.Scope.PUBLISH_POST]);

// console.log(AuthorizationUrl);

// const setAuCode = async function(url)
// {
// 	try {
// 		let resposne = await fetch(url);
// 		console.log(resposne);
		
// 	} catch (error) {
// 		console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );		
// 	}
// }
// setAuCode(AuthorizationUrl);
startBot();

async function startBot()
{
	await db_connect();
	let firstArt = null;
	let firstArtId = null;
	let firstArtColl = null;
	let firstArtUrl = null;
	let firstArtRes = null;
	let non_art_list = [];

	// Fetch Non Arts
	try
	{
		let collection = db.collection('social_media');
		let node = await collection.findOne( { "_id" : 'non_arts' });	
		if(node == null)
		{
			console.log("#Mongo. Can not find node document".yellow);
		}
		else
		{
			non_art_list = non_art_list.concat(node.list);
		}
	}
	catch (err)
	{
		console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
	}
	// Fecth published arts
	try
	{
		let collection = db.collection('social_media');
		let results = await collection.findOne( { "_id" : 'medium' });	
		if(results == null)
		{
			console.log("#Mongo. Can not find node document".yellow);
		}
		else
		{
			non_art_list = non_art_list.concat(Object.keys(results.published_art));
			for(let i = 0 ; i < non_art_list.length ; i++)
			{
				non_art_list[i] = new ObjectID (non_art_list[i]);
			}
		}
	}
	catch (err)
	{
		console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
	}

	// Set first article
	for (let el of consV.database.enc.EncsColls)
	{
		try
		{
			let collection = await db.collection(el);
			let res = await collection.findOne
			({
				'_id':
				{
					$nin: non_art_list,
				}
			});
			if(res == null)
			{
				console.log("#Mongo. Can not any unpubleshied/non-non-art document".yellow);
				// we are done here
			}
			else if(res)
			{
				firstArt = res;
				firstArtId = res._id;
				firstArtColl = el;
			}
		}
		catch (err)
		{
			console.error(new Error(`#Error. message: ${err}`.red));				
		}
	}

	// Create art url
	let url = await url_by_NodeId(firstArt._id , firstArtColl);
	firstArtUrl = url;

	// Fecth art resources
	try
	{
		let resources = await article_resources_WUsersAResInfo(firstArtId, firstArtColl)
		firstArtRes = resources;
	}
	catch (err)
	{
		console.error( new Error(`#Error. message: ${err}`.red) );
	}
	
	// Customize art
	let HTMLArtUrll = `<a href="${firstArtUrl}">برای مطالعه ی کامل مقاله اینجا کلیک کنید</a>`;
	firstArt.content.fa = firstArt.content.fa + HTMLArtUrll;

	// Post story/art
	request({
		method: "POST",
		url: `https://api.medium.com/v1/publications/${ups.medium.pubId}/posts`,
		json: true,
		headers:
		{
			Authorization: `Bearer ${ups.medium.token}`
		},
		body:
		{
			title: firstArt.treeTitle.fa,
			notifyFollowers: true,
			contentFormat: medium.PostContentFormat.HTML,
			content: firstArt.content.fa,
			publishStatus: medium.PostPublishStatus.PUBLIC
		}
	});	
	DbConn.close();
	console.log("#Done :)".green);		
}

async function db_connect()
{
	let mongo_server_address = 'localhost:27017/' + ups.mong_dbName;
	let url = 'mongodb://'+ ups.mongo_username + ':' + ups.mongo_password + '@' + mongo_server_address;

	try
	{
		DbConn = await mongoClient.connect(url)
		db = DbConn.db(ups.mong_dbName);
		console.log("#Mongo. Successfully connected to mongodb".green);	
	}
	catch (error)
	{
		console.error( new Error(`#Mongo #FIXME. Cannot connect to mongodb. message: ${err}`.red) );
	}
}

async function url_by_NodeId(node_id , collection)
{
	let coll = db.collection(collection);
	let callbackCalled = false;
	let url = [];

	let i = 0;
	let FC_counter = 1;
	
	async function rec(node_id)
	{
		try
		{
			let node = await coll.findOne( {"_id" : node_id} );
			if(node == null)
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
			if(FC_counter == 0)
			{
				url.push('https://' + consV.host.domain + '/fa' + '/encyclopedia');
				url.reverse();
				url = url.join('/');
			}
		}
		catch (err)
		{
			console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
		}
	}
	await rec(node_id);
	return url;
}

async function article_resources_WUsersAResInfo(nodeId, nodeEnc)
{
	try
	{
		let collection = db.collection(nodeEnc);
		let art = await collection.findOne( { "_id" : nodeId });
		let users = {};
		for (let key of Object.keys(art.resources))
		{
			let value = art.resources[key];
			for (let k of Object.keys(value.content_user))
			{
				let user = nodeInfCObj(k);
				if(user == null)
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
			}
		}
		let resses = await resources();
		return [art.resources, users, resses];
	}
	catch (err)
	{
		console.error( new Error(`#Mongo #FIXME. #Error. message: ${err}`.red) );
	}
}

async function nodeInfCObj(nodeId)
{
	let coll = await node_coll_by_Id(nodeId);
	if(coll == null)
	{
		return null;
	}
	let collection = db.collection(coll);
	let node_id = new ObjectID (nodeId);
	let nod = await collection.findOne( { "_id" : node_id });
	if(nod == null)
	{
		console.log("#Mongo. Can not find node document".yellow);
	}
	return nod;
}

async function node_coll_by_Id(nodeId)
{	
	let node_id = null;
	node_id = new ObjectID (nodeId);
	let coll = null;
	for ( let key of Object.keys(consV.database.allColls ))
	{
		el = consV.database.allColls[key];
		let collection = db.collection(el);
		let art = await collection.findOne( { "_id" : node_id } );
		if(art)
		{
			coll = consV.database.allColls[index];
		}
	}
	return coll;
}

async function resources()
{
	let collection = db.collection('site');
	let resources = await collection.findOne( { "_id" : 'resources' });
	delete resources._id;
	return resources;
}

function root_id_by_coll_name(coll_name)
{
	let res = null;
	Object.keys(consV.database.enc).forEach(async (element) => {
		if(typeof consV.database.enc[element].CollName != 'undefined' && consV.database.enc[element].CollName == coll_name)
		{
			res = consV.database.enc[element].rootObjId.valueOf().toString();
		}
	});
	return res;
}