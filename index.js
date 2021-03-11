// Copyright 2021 Lynn O. All rights reserved

/// Requirements
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const leo = require("leo-profanity");
const path = require("path");
const random = require("random");
const fs = require("fs")

/// Set up packages
leo.loadDictionary("en")

/// Define variables
var dir = path.join(__dirname, "client");
var rooms = {};

var words = JSON.parse(fs.readFileSync("words.json"));

// Serves a static page
app.use(express.static(dir));

// Opens given port or 3000
http.listen(process.env.PORT || 3000, function () {
    console.log("Starting on port : " + (process.env.PORT || 3000));
	console.log("http://localhost:" + (process.env.PORT || 3000) + "?id=test+name=auto");
})

io.on("connect", (socket) => {

	// Find the socket from a room with a given id
	find_socket_index = (id, socket_id) => {
		if (rooms[id]){
			return rooms[id].sockets.findIndex((x) => {return x.id == socket_id});
		}
	}

	// Update names and score
	update_players = (id) => {
		if (rooms[id]){
			let players = [];
			let points = [];
			let states = [];

			for (i=0; i<rooms[id].sockets.length; i++){
				players.push(rooms[id].sockets[i].name);
				points.push(rooms[id].sockets[i].points);
				states.push(rooms[id].sockets[i].state);
				rooms[id].sockets[i].socket.emit("update-score", rooms[id].sockets[i].points);
			}
			io.to(id).emit("update-players", players, points, states);
			io.to(id).emit("update-chat", rooms[id].chat);
		}
	}

	// Resets the round
	reset_game = (id) => {
		if (rooms[id]){
			rooms[id].number_guessed = 0;
			io.to(id).emit("reset-game");
	
			rooms[id].info = "Waiting for more players...";
			io.to(id).emit("update-info", rooms[id].info);
	
			rooms[id].drawer = {};
			clearInterval(rooms[id].interval);
			clearTimeout(rooms[id].timeout);

			rooms[id].sockets.forEach((x) => {
				x.state = "";
			})

			update_players(socket.room);
		}
	}

	// Let's a player join a room
	start_seq = (id) => {
		if (rooms[id] && rooms[id].sockets.length >= 2 && Object.keys(rooms[id].drawer).length == 0){
			rooms[id].info = "Game starting...";
			io.to(id).emit("update-info", rooms[id].info);

			setTimeout(() => {
				drawer = rooms[id].sockets[random.int(0, rooms[id].sockets.length - 1)];
				rooms[id].drawer = drawer;
				rooms[id].sockets.find((x) => {return x == drawer}).state = "drawer"
				
				let list = [];
				for (i=0; i<4; i++){
					word = rooms[id].package[random.int(0, rooms[id].package.length - 1)];
					if (!list.find((x) => {return x == word})){
						list.push(word);
					}
					else {
						i -= 1;
					}
				}

				rooms[id].list = list;
				rooms[id].word = list[random.int(0, list.length - 1)];
				rooms[id].info = "Game has started!";
				rooms[id].drawer.socket.to(id).emit("update-info", rooms[id].info);
				rooms[id].drawer.socket.emit("update-info", "Your word is : " + rooms[id].word + ".");
				update_players(id);

				io.to(id).emit("start-game", drawer.name, rooms[id].list);

				rooms[id].timeout = setTimeout(() => {
					reset_game(socket.room);

					start_seq(socket.room);
				}, 45000)

				let x = 45
				rooms[id].interval = setInterval(() => {
					if (x <= 0){
						clearInterval(rooms[id].interval);
					}
					else {
						x -= 1;
						io.to(socket.room).emit("time", x);
					}
				}, 1000)
			}, 500)
		}
		else if (rooms[id] && Object.keys(rooms[id].drawer).length > 0){
			socket.emit("start-game", rooms[id].drawer.name, rooms[id].list);
			socket.emit("update-info", rooms[id].info);
			rooms[id].drawer.socket.emit("update-info", "Your word is : " + rooms[id].word + ".");
		}
		else if (rooms[id]) {
			rooms[id].info = "Waiting for more players...";
			io.to(id).emit("update-info", rooms[id].info);
		}
	}

	// Remove player data on leave
	socket.on("disconnect", () => {
		if (socket.room){
			rooms[socket.room].sockets.splice(rooms[socket.room].sockets.findIndex((x) => {return x.id == socket.id}), 1);
			
			if (rooms[socket.room].sockets.length == 1) {
				// Wait for more players if there isn't enough players
				reset_game(socket.room);
			}

			if (rooms[socket.room].sockets.length >= 1){
				// Reset the round if the current drawer left
				if (rooms[socket.room].drawer.id == socket.id){
					reset_game(socket.room);
				}

				// Give admin to the oldest player if the current admin left
				if (rooms[socket.room].admin.id == socket.id){
					rooms[socket.room].admin = {
						id: rooms[socket.room].sockets[0].id,
						name: rooms[socket.room].sockets[0].name,
						socket: rooms[socket.room].sockets[0].socket,
					}
				}

				rooms[socket.room].admin.socket.emit("update-admin", true);
				update_players(socket.room);
			}
			else {
				// Delete the room when there are no players
				delete rooms[socket.room];
			}
		} 
	})

	socket.on("check", (id, callback) => {
		if (rooms[id]){
			callback(true);
		}
		else{
			callback(false);
		}
	})

	// Checks if room exists if not create it
	socket.on("create-request", (name, id, wordlist, custom) => {
		if (!(id in rooms)) {
			let custom_words = []
			if (wordlist && wordlist.length > 0 && wordlist.split(",").length > 1){
				custom_words = wordlist.split(",").filter((x) => {return x.length >= 3});
			}

			rooms[id] = {
			id: id,
			sockets: [
				{
					id: socket.id,
					name: name,
					socket: socket,
					points: 0,
					state: "",
				}
			],
			admin: {
				id: socket.id,
				name: name,
				socket: socket,
			},
			info: "Waiting for more players...",
			word: "",
			package: ((custom && custom_words.length >= 4) ? custom_words : [...words["standard"],...custom_words]),
			drawer: {},
			points: {},
			list: [],
			chat: [],
			number_guessed: 0,
		}

		socket.room = id;
		socket.name = name;

		socket.join(id);
		socket.emit("create-success", id, name);

		rooms[id].admin.socket.emit("update-admin", true);
		update_players(socket.room);

		io.to(id).emit("update-info", rooms[id].info);

		start_seq(id);
		}
		else {
			socket.emit("connection-failed");
		}
	})

	// Checks if room exists if so join it
	socket.on("join-request", (name, id) => {
		if ((id in rooms) && !(rooms[id].sockets.find((x) => {x == name}))) {
			rooms[id].sockets.push({
				id : socket.id,
				name : name,
				socket : socket,
				points: 0,
			})

			socket.room = id;
			socket.name = name;

			socket.join(id);
			socket.emit("join-success", id, name);

			rooms[id].admin.socket.emit("update-admin", true);
			update_players(socket.room);

			io.to(id).emit("update-info", rooms[id].info);

			start_seq(id);
		}
		else {
			socket.emit("connection-failed");
		}
	})

	// Checks a guess and reward accordingly
	socket.on("guess", (guess, callback) => {
		if (rooms[socket.room] && rooms[socket.room].drawer.id != socket.id){
			if (rooms[socket.room].word == guess){
				rooms[socket.room].sockets[find_socket_index(socket.room, socket.id)].points += 5;
				rooms[socket.room].sockets[find_socket_index(socket.room, socket.id)].state = "correct";

				rooms[socket.room].sockets[find_socket_index(socket.room, rooms[socket.room].drawer.id)].points += 2;

				update_players(socket.room);
			}
			else {
				rooms[socket.room].sockets[find_socket_index(socket.room, socket.id)].state = "incorrect";
			}

			rooms[socket.room].number_guessed += 1;
			if (rooms[socket.room].number_guessed >= rooms[socket.room].sockets.length - 1) {
				setTimeout(() => {
					reset_game(socket.room);

					start_seq(socket.room);
				}, 2000);
			}

			callback(rooms[socket.room].word);
			update_players(socket.room);
		} 
	})

	// Sends canvas to all players
	socket.on("update-canvas", (data) => {
		if (rooms[socket.room] && rooms[socket.room].drawer.id == socket.id){
			socket.to(socket.room).emit("update-canvas", data);
		}
	})

	// Recieves chat message and fowards it to all players
	socket.on("send-message", (message) => {
		// TODO : Censor Chat
		rooms[socket.room].chat.push([rooms[socket.room].sockets[find_socket_index(socket.room, socket.id)].name, leo.clean(message, "*")]);
		
		if (rooms[socket.room].chat.length > 30 && message.length <= 45) {
			rooms[socket.room].chat.splice(0, 1);
		}

		update_players(socket.room);
	})

	// Handles a ban request
	socket.on("kick-request", (name) => {
		if (rooms[socket.room].admin.id == socket.id){
			rooms[socket.room].sockets.forEach((x) => {
				if (x.name == name) {
					x.socket.emit("kick");
				}	
			})
		}
	})
})