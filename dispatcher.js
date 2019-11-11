const WebSocket = require('ws');
const clients = [];
var express = require('express');
const Poi = require('./models/poi');
const Rate = require('./models/rating');
const User = require('./models/user');


exports.createBackendDispatcher = function(server) {

  const wss = new WebSocket.Server({
    server
  });


  //  implémenter l'écoute sur post et delete en les mettant dans les bonnes route ; post -> delete de chaque route
  wss.on('connection', function(ws) {
    // ajouter un client dans le tableau lorsqu'il se connecte
    	clients.push(ws);
    	

    ws.on('close', function() {
    	// enlever du tableau lors qu'il se déconnecte
		function isClient(el) {
		  return el === ws;
		}

		clients.splice(clients.findIndex(isClient), 1);
    });

  });

};

exports.notifyCount = function() {
	// fonction qui envoie les datas à chaque client connecté (tableau)
	// message à tous
	function createMessage(TotalUser, TotalPoi, TotalRating) {
		let message = {
			TotalUser: TotalUser,
			TotalPoi: TotalPoi,
			TotalRating: TotalRating
			};
		 return message; 
	};

	async function getMessage() {

		let TotalUser = await User.find().count();
		let TotalPoi = await Poi.find().count();
		let TotalRating = await Rate.find().count();
		let message = createMessage(TotalUser, TotalPoi, TotalRating);

		return message;
	};

	getMessage()
		.then(function(message){
			clients.forEach(function(client){
				client.send(JSON.stringify(message));
			});
		});
	
};