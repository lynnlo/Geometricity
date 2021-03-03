// Copyright 2021 Lynn O. All rights reserved

// Requirements
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");
const random = require("random");
const fs = require("fs")

// Define variables
var dir = path.join(__dirname, "client");
var rooms = {};

var words = JSON.parse(fs.readFileSync("words.json"));

// Serves a static page
app.use(express.static(dir));

// Opens given port or 3000
http.listen(process.env.PORT || 3000, function () {
    console.log("Starting on port : " + (process.env.PORT || 3000));
	console.log("http://localhost:" + (process.env.PORT || 3000));
})

io.on("connect", (socket) => {

	// Find the socket from a room with a given id
	find_socket_index = (id, socket_id) => {
		return rooms[id].sockets.findIndex((x) => {return x.id == socket_id});
	}

	// Update names and score
	update_players = (id) => {
		let players = [];
		let points = [];

		for (i=0; i<rooms[id].sockets.length; i++){
			players.push(rooms[id].sockets[i].name);
			points.push(rooms[id].sockets[i].points);
			rooms[id].sockets[i].socket.emit("update-score", rooms[id].sockets[i].points);
		}
		io.to(id).emit("update-players", players, points);
	}

	// Resets the round
	reset_game = (id) => {
		rooms[id].number_guessed = 0;
		io.to(id).emit("reset-game");

		rooms[id].info = "Waiting for more players...";
		io.to(id).emit("update-info", rooms[id].info);

		rooms[id].drawer = {};
		clearInterval(rooms[id].interval);
		clearTimeout(rooms[id].timeout);
	}

	// Let's a player join a room
	start_seq = (id) => {
		if (rooms[id].sockets.length >= 2 && Object.keys(rooms[id].drawer).length == 0){
			rooms[id].info = "Game starting...";
			io.to(id).emit("update-info", rooms[id.info]);

			setTimeout(() => {
				drawer = rooms[id].sockets[random.int(0, rooms[id].sockets.length - 1)];
				rooms[id].drawer = drawer;
				
				let list = [];
				for (i=0; i<4; i++){
					word = words.math[random.int(0, words.math.length - 1)];
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
				}, 30000)

				let x = 60
				rooms[id].interval = setInterval(() => {
					if (x <= 0){
						clearInterval(rooms[id].interval);
					}
					else {
						x -= 1;
						io.to(socket.room).emit("time", x);
					}
				}, 500)
			}, 750)
		}
		else if (Object.keys(rooms[id].drawer).length > 0){
			socket.emit("start-game", rooms[id].drawer.name, rooms[id].list);
			socket.emit("update-info", rooms[id].info);
		}
	}

	// Remove player data on leave
	socket.on("disconnect", () => {
		if (socket.room){
			rooms[socket.room].sockets.splice(rooms[socket.room].sockets.findIndex((x) => {return x.id == socket.id}), 1);

			if (rooms[socket.room].drawer.id == socket.id){
				reset_game(socket.room);
			}

			update_players(socket.room);
		} 
	})

	// Checks if room exists if not create it
	socket.on("create-request", (name, id) => {
		if (!(id in rooms)) {
			rooms[id] = {
			id: id,
			sockets: [
				{
					id: socket.id,
					name: name,
					socket: socket,
					points: 0,
				}
			],
			info: "Waiting for more players...",
			word: "",
			drawer: {},
			points: {},
			list: [],
			number_guessed: 0,
		}

		socket.room = id;
		socket.name = name;

		socket.join(id);
		socket.emit("create-success", id, name);
		update_players(socket.room);

		start_seq(id);
		io.to(id).emit("update-info", rooms[id].info);
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
			update_players(socket.room);

			start_seq(id);
		}
		else {
			socket.emit("connection-failed");
		}
	})

	// Checks a guess and reward accordingly
	socket.on("guess", (guess) => {
		if (rooms[socket.room].drawer.id != socket.id){
			if (rooms[socket.room].word == guess){
				rooms[socket.room].sockets[find_socket_index(socket.room, socket.id)].points += 5;

				rooms[socket.room].sockets[find_socket_index(socket.room, rooms[socket.room].drawer.id)].points += 2;

				update_players(socket.room);
			}
			rooms[socket.room].number_guessed += 1;
			if (rooms[socket.room].number_guessed >= rooms[socket.room].sockets.length - 1) {
				reset_game(socket.room);

				start_seq(socket.room);
			}
		} 
	})

	// Sends canvas to all players
	socket.on("update-canvas", (data) => {
		if (rooms[socket.room].drawer.id == socket.id){
			socket.to(socket.room).emit("update-canvas", data);
		}
	})
})