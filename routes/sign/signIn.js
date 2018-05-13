"use strict";

var mongo = require( consV.methods.db.main);
let middlewares = require( consV.methods.middlewares);
let express = require("express");
var async = require('async');
var router = express.Router({mergeParams: true});

router.route('/')
.get(function(req , res)
{
	let title = "هیلایت . ورود به سایت";		
	res.render("sign/signIn" ,
	{
		title: title
	});
})
.post(async function(req , res)
{
	if(req.body.emUs == "" || typeof req.body.emUs == "undefined" ||
   req.body.password == "" || typeof req.body.password == "undefined")
   {
		res.send( consV.codes.lackOfInformation.toString() );
		return;
   }
	try
	{
		let user = await mongo.userInfoByEmOrUN(req.body.emUs , req.body.password);
		if( user == null )
		{
			res.send( consV.codes.db.docNotFound.toString() );
		}
		else if( user )
		{
			req.session.logged = true;
			req.session.user = user;

			res.send( consV.codes.db.success.toString() );
		}
	}
	catch (error)
	{
		res.send( consV.codes.db.Error.toString() );
	}
});

module.exports = router;
