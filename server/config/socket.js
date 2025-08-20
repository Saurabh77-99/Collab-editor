// config/socket.js
const socketConfig = {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true,
  },
  // Server-side timeout
  pingTimeout: 60000,
  pingInterval: 25000,
  // Client connection timeout
  connectTimeout: 45000,
  // Max HTTP buffer size
  maxHttpBufferSize: 1e6,
  // Allow upgrades to websocket
  allowUpgrades: true,
  // Transport options
  transports: ['websocket', 'polling']
};

module.exports = socketConfig;

