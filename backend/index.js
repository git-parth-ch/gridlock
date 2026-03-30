require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] }
});

// Expose socket instance to route handlers (used for kicking clients on logout)
app.locals.io = io;

app.use(cors());
app.use(express.json());

app.use('/api/teams',       require('./routes/teams'));
app.use('/api/questions',   require('./routes/questions'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/piston',      require('./routes/piston'));
app.use('/api/admin',       require('./routes/admin'));

require('./sockets/teamSocket')(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`GRIDLOCK backend listening on :${PORT}`));