import express from "express";
import { app } from "./app.js";
import connectdatabse from "./db/databse.js";
import dotenv from "dotenv";
import { Server } from "socket.io";
import http from "http";
import { User } from "./models/user.model.js";
dotenv.config({
  path: "./.env",
});
connectdatabse()
  .then(() => {
    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        // origin: "https://frontend-tau-ivory-25.vercel.app",
        origin: "http://localhost:5173",
        credentials: true,
      },
    });
    app.use((req, res, next) => {
      req.io = io;
      next();
    });
    app.set("io", io);
    const onlineUsers = new Map();

    io.on("connection", (socket) => {
      socket.on("join_user", (userId) => {
        socket.join(userId);

        if (!onlineUsers.has(userId)) {
          onlineUsers.set(userId, new Set());
        }

        onlineUsers.get(userId).add(socket.id);

        io.emit("all_online_users", Array.from(onlineUsers.keys()));
      });
      socket.on("get_online_users", () => {
        socket.emit("all_online_users", Array.from(onlineUsers.keys()));
      });
      socket.on("join_chat", (chatId) => {
        socket.join(chatId.toString());
      });
      socket.on("leave_chat", (chatId) => {
        socket.leave(chatId);
        // console.log("LEFT:", chatId);
      });

      socket.on("typing", ({ chatId, userId }) => {
        socket.to(chatId).emit("typing", { chatId, userId });
      });

      socket.on("stop_typing", ({ chatId, userId }) => {
        socket.to(chatId).emit("stop_typing", { chatId, userId });
      });

      socket.on("inactive", async (userId) => {
        onlineUsers.delete(userId);

        await User.findByIdAndUpdate(userId, {
          lastSeen: new Date(),
        });

        socket.broadcast.emit("user_offline", {
          userId,
          lastSeen: new Date(),
        });
      });

      socket.on("disconnect", async () => {
        let disconnectedUser = null;

        for (let [userId, socketSet] of onlineUsers.entries()) {
          if (socketSet.has(socket.id)) {
            socketSet.delete(socket.id);

            if (socketSet.size === 0) {
              onlineUsers.delete(userId);
              disconnectedUser = userId;
            }
            break;
          }
        }

        if (disconnectedUser) {
          const lastSeen = new Date();

          await User.findByIdAndUpdate(disconnectedUser, {
            lastSeen,
          });

          socket.broadcast.emit("user_offline", {
            userId: disconnectedUser,
            lastSeen,
          });
        }
      });
    });
    server.listen(process.env.PORT || 4000, () => {
      console.log(
        `⚙️ Server is running at port : http://localhost:${process.env.PORT}`
      );
    });
    app.on("error", (error) => {
      console.log("Error", error);
      throw error;
    });
  })
  .catch((error) => {
    console.log("mongo connection failed", error);
  });
