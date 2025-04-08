"use strict";
import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import readline from "node:readline";
import os from "node:os";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "index.html"));
});

let taskList = [
  "Release trash",
  "Stabalize thrusters",
  "Swipe keycard",
  "Check O2 levels",
  "Set Navigation",
  "Connect Wires",
];
let roleList = ["Innocent", "Impostor"];
let minimumPlayers = 3;
let numImpostors = 1;
let numTasks = 2;

class Socket {
  constructor(id) {
    this.id = id;
    this.role = "Unassigned";
    this.tasks = ["None yet"];
  }
}
const sockets = [];

io.on("connection", (socket) => {
  sockets.push(new Socket(socket.id));
  console.log(`Socket: ${socket.id} connected.`);
  console.log(sockets);
  socket.on("disconnect", () => {
    sockets.splice(
      sockets.indexOf(sockets.find((element) => element.id === socket.id)),
      1
    );
    console.log(`Socket: ${socket.id} disconnected.`);
    console.log(sockets);
  });
  if (sockets.length >= minimumPlayers)
    rl.question("Start? Y/n:\n", (answer) => {
      if (answer.toLowerCase() !== "y") return;
      console.log("Assigning random role and tasks...");
      let impostors = [];
      for (let impostor = 0; impostor < numImpostors; impostor++) {
        let randImpostorNum = Math.floor(Math.random() * minimumPlayers);
        if (impostors.includes(randImpostorNum)) {
          impostor--;
        } else {
          impostors[impostor] = randImpostorNum;
        }
      }
      sockets.forEach((socket) => {
        if (impostors.includes(sockets.indexOf(socket))) {
          socket.role = roleList[1];
          socket.tasks = ["Blend in", "Good luck"];
        } else {
          socket.role = roleList[0];
          for (let task = 0; task < numTasks; task++) {
            let randTask =
              taskList[Math.floor(Math.random() * taskList.length)];
            if (socket.tasks.includes(randTask)) {
              task--;
            } else {
              socket.tasks[task] = randTask;
            }
          }
        }
      });
      console.log(sockets);
      console.log("Sending data to sockets.");
      sockets.forEach((element) => {
        io.to(element.id).emit("start", element);
      });
      console.log("Done.");
    });
});

rl.question(
  "How many players, impostors, and tasks? (Default: 3 1 2). ",
  (answer) => {
    if (answer !== "") {
      parseInt(answer.split(" ")[0]) >= 3
        ? (minimumPlayers = parseInt(answer.split(" ")[0]))
        : console.log("Minimum of 3 players. Using default.");
      parseInt(answer.split(" ")[1]) >= 1
        ? (minimumPlayers = parseInt(answer.split(" ")[1]))
        : console.log("Minimum of 1 impostor(s). Using default.");
      parseInt(answer.split(" ")[2]) >= 1
        ? (minimumPlayers = parseInt(answer.split(" ")[2]))
        : console.log("Minimum of 1 task(s). Using default.");
    }
    console.log(
      `${minimumPlayers} players minimum with ${numImpostors} impostors and ${numTasks} tasks.`
    );
    server.listen(8080, () => {
      const hostIP =
        os.networkInterfaces()[
          Object.getOwnPropertyNames(os.networkInterfaces())[1]
        ][0]["address"];
      console.log(`Server started running at: http://${hostIP}:8080`);
    });
  }
);
