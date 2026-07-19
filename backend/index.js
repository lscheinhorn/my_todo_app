// index.js (Backend)
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { randomBytes } from "crypto";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://my-todo-app-frontend-catn.onrender.com",
];

const corsOptions = {
  origin: allowedOrigins,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI is not set in environment variables.");
  process.exit(1);
}

const configuredUserId = process.env.TODO_APP_USER_ID;

if (!configuredUserId) {
  console.error("TODO_APP_USER_ID is not set. Run the ownership migration before serving data.");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB Atlas"))
  .catch((err) => console.error("MongoDB connection error:", err));

const userOwnedFields = {
  userId: { type: String, required: true, index: true },
};

const taskSchema = new mongoose.Schema({
  ...userOwnedFields,
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  spaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Space", default: null },
  createdAt: { type: Date, default: Date.now },
  dueDate: { type: Date, default: null },
  priority: { type: String, enum: ["none", "priority", "high"], default: "none" },
  deletedAt: { type: Date, default: null },
});

taskSchema.index({ userId: 1, deletedAt: 1 });
taskSchema.index({ userId: 1, spaceId: 1, deletedAt: 1 });
taskSchema.index({ userId: 1, dueDate: 1 });

const Task = mongoose.model("Task", taskSchema);

const spaceSchema = new mongoose.Schema({
  ...userOwnedFields,
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

spaceSchema.index({ userId: 1, name: 1 });

const Space = mongoose.model("Space", spaceSchema);

const subListItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  priority: { type: String, enum: ["none", "priority", "high"], default: "none" },
  dueTime: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const subListSchema = new mongoose.Schema({
  ...userOwnedFields,
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
  name: { type: String, default: "New List" },
  items: [subListItemSchema],
});

subListSchema.index({ userId: 1, taskId: 1 });

const SubList = mongoose.model("SubList", subListSchema);

const waterLiveParticipantSchema = new mongoose.Schema(
  {
    participantId: { type: String, required: true },
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracyMeters: { type: Number, default: null },
    speedMps: { type: Number, default: null },
    headingDegrees: { type: Number, default: null },
    clientTimestamp: { type: Date, default: null },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const waterLiveRoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true, index: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
  ownerName: { type: String, default: "Third Eye" },
  participants: [waterLiveParticipantSchema],
});

waterLiveRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const WaterLiveRoom = mongoose.model("WaterLiveRoom", waterLiveRoomSchema);

const WATER_LIVE_ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const WATER_LIVE_STALE_AFTER_MS = 45 * 1000;
const WATER_LIVE_ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const WATER_LIVE_MAX_PARTICIPANTS = 12;

function attachTemporaryUser(req, res, next) {
  req.user = { id: configuredUserId };
  next();
}

function requireAssistantToken(req, res, next) {
  const expectedToken = process.env.TODO_APP_ASSISTANT_TOKEN;
  if (!expectedToken) {
    return res.status(503).json({ message: "Assistant API is not configured" });
  }

  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || token !== expectedToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  return next();
}

function ownedQuery(req, extra = {}) {
  return { userId: req.user.id, ...extra };
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function badObjectId(res) {
  return res.status(400).json({ message: "Invalid id" });
}

function sendServerError(res, message, err) {
  console.error(message, err);
  return res.status(500).json({ message });
}

async function userOwnsSpace(userId, spaceId) {
  if (!spaceId) return true;
  if (!isValidObjectId(spaceId)) return false;
  return Boolean(await Space.exists({ _id: spaceId, userId }));
}

async function userOwnsTask(userId, taskId) {
  if (!isValidObjectId(taskId)) return false;
  return Boolean(await Task.exists({ _id: taskId, userId }));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sortTasksForAssistant(tasks) {
  const priorityRank = { high: 0, priority: 1, none: 2 };

  return tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    const priorityDelta =
      (priorityRank[a.priority] ?? priorityRank.none) -
      (priorityRank[b.priority] ?? priorityRank.none);
    if (priorityDelta !== 0) return priorityDelta;

    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;

    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

function buildTaskQuery(req) {
  const { spaceId, includeDeleted, completed, priority } = req.query;
  const query = ownedQuery(req, {});

  if (includeDeleted !== "true") {
    query.deletedAt = null;
  }

  if (spaceId && spaceId !== "ALL") {
    if (!isValidObjectId(spaceId)) return null;
    query.spaceId = spaceId;
  }

  if (completed === "true") query.completed = true;
  if (completed === "false") query.completed = false;
  if (priority) query.priority = priority;

  return query;
}

function taskUpdateFromBody(body) {
  const update = {};

  for (const field of ["text", "completed", "dueDate", "priority"]) {
    if (field in body) update[field] = body[field];
  }

  if ("spaceId" in body) {
    update.spaceId = body.spaceId || null;
  }

  return update;
}

function normalizeWaterLiveRoomCode(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (normalized.length < 6 || normalized.length > 12) {
    return null;
  }
  return normalized;
}

function sanitizeWaterLiveName(value, fallback = "Friend") {
  const text = String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 48);
  return text || fallback;
}

function sanitizeWaterLiveParticipantId(value) {
  const text = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  return text || `friend-${Date.now()}`;
}

function finiteNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeWaterLiveLocation(body) {
  const latitude = finiteNumberOrNull(body.latitude);
  const longitude = finiteNumberOrNull(body.longitude);
  if (
    latitude === null ||
    longitude === null ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return null;
  }

  const clientTimestamp =
    typeof body.timestamp === "string" || typeof body.clientTimestamp === "string"
      ? new Date(body.timestamp || body.clientTimestamp)
      : null;

  return {
    accuracyMeters: finiteNumberOrNull(body.accuracyMeters),
    clientTimestamp:
      clientTimestamp && Number.isFinite(clientTimestamp.getTime()) ? clientTimestamp : null,
    headingDegrees: finiteNumberOrNull(body.headingDegrees),
    latitude,
    longitude,
    name: sanitizeWaterLiveName(body.name),
    participantId: sanitizeWaterLiveParticipantId(body.participantId),
    speedMps: finiteNumberOrNull(body.speedMps),
    updatedAt: new Date(),
  };
}

function generateWaterLiveRoomCode() {
  const bytes = randomBytes(8);
  let code = "";
  for (const byte of bytes) {
    code += WATER_LIVE_ROOM_ALPHABET[byte % WATER_LIVE_ROOM_ALPHABET.length];
  }
  return code;
}

async function generateUniqueWaterLiveRoomCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const roomCode = generateWaterLiveRoomCode();
    const existing = await WaterLiveRoom.exists({ roomCode });
    if (!existing) {
      return roomCode;
    }
  }

  throw new Error("Unable to allocate a live tracking room.");
}

function getRequestBaseUrl(req) {
  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : req.protocol;
  const host = forwardedHost ? forwardedHost.split(",")[0].trim() : req.get("host");
  return `${proto}://${host}`;
}

function serializeWaterLiveRoom(room) {
  const now = Date.now();
  return {
    expiresAt: room.expiresAt.toISOString(),
    participants: room.participants.map((participant) => {
      const updatedAtMs = new Date(participant.updatedAt).getTime();
      const ageMs = Math.max(0, now - updatedAtMs);
      return {
        accuracyMeters: participant.accuracyMeters,
        ageMs,
        headingDegrees: participant.headingDegrees,
        latitude: participant.latitude,
        longitude: participant.longitude,
        name: participant.name,
        participantId: participant.participantId,
        speedMps: participant.speedMps,
        stale: ageMs > WATER_LIVE_STALE_AFTER_MS,
        updatedAt: new Date(participant.updatedAt).toISOString(),
      };
    }),
    roomCode: room.roomCode,
    serverTime: new Date(now).toISOString(),
    staleAfterMs: WATER_LIVE_STALE_AFTER_MS,
  };
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildWaterLiveSharePage(roomCode) {
  const safeRoomCode = escapeHtml(roomCode);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>Third Eye Water Live ${safeRoomCode}</title>
  <style>
    :root { color-scheme: dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; min-height: 100vh; background: #020617; color: #f8fafc; display: grid; place-items: center; }
    main { width: min(92vw, 560px); padding: 28px; border: 3px solid #93c5fd; border-radius: 28px; background: #08111f; }
    h1 { margin: 0 0 12px; font-size: clamp(2rem, 9vw, 3.5rem); line-height: 1; }
    p, label { color: #cbd5e1; font-size: 1.15rem; line-height: 1.35; }
    input { box-sizing: border-box; width: 100%; margin: 8px 0 18px; padding: 16px; border-radius: 16px; border: 2px solid #334155; background: #020617; color: #fff; font-size: 1.2rem; }
    button { width: 100%; margin-top: 12px; padding: 18px; border: 0; border-radius: 20px; background: #bbf7d0; color: #07111f; font-weight: 800; font-size: 1.4rem; }
    button.secondary { background: #1e293b; color: #f8fafc; border: 2px solid #475569; }
    #status { min-height: 4.5em; margin-top: 18px; padding: 16px; border-radius: 18px; background: #0f172a; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>Share Water Location</h1>
    <p>Room ${safeRoomCode}. Keep this page open while sharing. Stop sharing when you are done.</p>
    <label for="name">Your name</label>
    <input id="name" autocomplete="name" placeholder="Friend" />
    <button id="start">Start Sharing</button>
    <button class="secondary" id="stop">Stop Sharing</button>
    <div id="status" role="status" aria-live="polite">Ready.</div>
  </main>
  <script>
    const roomCode = ${JSON.stringify(roomCode)};
    const status = document.getElementById("status");
    const nameInput = document.getElementById("name");
    const participantKey = "thirdEyeWaterParticipantId";
    const nameKey = "thirdEyeWaterParticipantName";
    let watchId = null;
    let wakeLock = null;

    function getParticipantId() {
      let id = localStorage.getItem(participantKey);
      if (!id) {
        id = "web-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(participantKey, id);
      }
      return id;
    }

    function setStatus(message) {
      status.textContent = message;
    }

    function getName() {
      const name = nameInput.value.trim() || "Friend";
      localStorage.setItem(nameKey, name);
      return name;
    }

    async function requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          wakeLock = await navigator.wakeLock.request("screen");
        }
      } catch {
        wakeLock = null;
      }
    }

    async function postPosition(position) {
      const coords = position.coords;
      const response = await fetch("/public/water-live/rooms/" + encodeURIComponent(roomCode) + "/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accuracyMeters: coords.accuracy,
          headingDegrees: coords.heading,
          latitude: coords.latitude,
          longitude: coords.longitude,
          name: getName(),
          participantId: getParticipantId(),
          speedMps: coords.speed,
          timestamp: new Date(position.timestamp).toISOString()
        })
      });
      if (!response.ok) {
        throw new Error("Server rejected location update.");
      }
      const data = await response.json();
      const me = data.participants.find((participant) => participant.participantId === getParticipantId());
      const accuracy = me && Number.isFinite(me.accuracyMeters) ? ", accuracy " + Math.round(me.accuracyMeters) + " meters" : "";
      setStatus("Sharing now. Last update " + new Date().toLocaleTimeString() + accuracy + ".");
    }

    function startSharing() {
      if (!navigator.geolocation) {
        setStatus("This browser does not support location sharing.");
        return;
      }
      if (watchId !== null) {
        setStatus("Already sharing.");
        return;
      }
      requestWakeLock();
      setStatus("Starting. Allow location when asked.");
      watchId = navigator.geolocation.watchPosition(
        (position) => postPosition(position).catch((error) => setStatus(error.message)),
        (error) => setStatus(error.message || "Location sharing failed."),
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 12000 }
      );
    }

    async function stopSharing() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (wakeLock) {
        try { await wakeLock.release(); } catch {}
      }
      wakeLock = null;
      setStatus("Stopped sharing.");
    }

    nameInput.value = localStorage.getItem(nameKey) || "";
    document.getElementById("start").addEventListener("click", startSharing);
    document.getElementById("stop").addEventListener("click", stopSharing);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && watchId !== null) {
        requestWakeLock();
      }
    });
  </script>
</body>
</html>`;
}

app.get("/", (req, res) => {
  res.send("Welcome to the My To-Do App API!");
});

app.post("/public/water-live/rooms", async (req, res) => {
  try {
    const roomCode = await generateUniqueWaterLiveRoomCode();
    const room = new WaterLiveRoom({
      expiresAt: new Date(Date.now() + WATER_LIVE_ROOM_TTL_MS),
      ownerName: sanitizeWaterLiveName(req.body?.name, "Third Eye"),
      participants: [],
      roomCode,
    });
    await room.save();
    const shareUrl = `${getRequestBaseUrl(req)}/public/water-live/share/${roomCode}`;
    return res.status(201).json({ ...serializeWaterLiveRoom(room), shareUrl });
  } catch (err) {
    return sendServerError(res, "Error creating water live room", err);
  }
});

app.get("/public/water-live/share/:roomCode", async (req, res) => {
  const roomCode = normalizeWaterLiveRoomCode(req.params.roomCode);
  if (!roomCode) {
    return res.status(400).send("Invalid room code.");
  }

  const room = await WaterLiveRoom.findOne({
    expiresAt: { $gt: new Date() },
    roomCode,
  });
  if (!room) {
    return res.status(404).send("This live tracking room has expired or does not exist.");
  }

  return res.type("html").send(buildWaterLiveSharePage(roomCode));
});

app.get("/public/water-live/rooms/:roomCode", async (req, res) => {
  try {
    const roomCode = normalizeWaterLiveRoomCode(req.params.roomCode);
    if (!roomCode) {
      return res.status(400).json({ message: "Invalid room code" });
    }

    const room = await WaterLiveRoom.findOne({
      expiresAt: { $gt: new Date() },
      roomCode,
    });
    if (!room) {
      return res.status(404).json({ message: "Live tracking room not found" });
    }

    return res.json(serializeWaterLiveRoom(room));
  } catch (err) {
    return sendServerError(res, "Error fetching water live room", err);
  }
});

app.post("/public/water-live/rooms/:roomCode/locations", async (req, res) => {
  try {
    const roomCode = normalizeWaterLiveRoomCode(req.params.roomCode);
    if (!roomCode) {
      return res.status(400).json({ message: "Invalid room code" });
    }

    const location = normalizeWaterLiveLocation(req.body || {});
    if (!location) {
      return res.status(400).json({ message: "Valid latitude and longitude are required" });
    }

    const room = await WaterLiveRoom.findOne({
      expiresAt: { $gt: new Date() },
      roomCode,
    });
    if (!room) {
      return res.status(404).json({ message: "Live tracking room not found" });
    }

    const existingIndex = room.participants.findIndex(
      (participant) => participant.participantId === location.participantId
    );
    if (existingIndex >= 0) {
      room.participants[existingIndex] = location;
    } else {
      room.participants.push(location);
    }
    room.participants = room.participants
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
      .slice(0, WATER_LIVE_MAX_PARTICIPANTS);

    await room.save();
    return res.json(serializeWaterLiveRoom(room));
  } catch (err) {
    return sendServerError(res, "Error updating water live location", err);
  }
});

app.use(attachTemporaryUser);

const assistantRouter = express.Router();

assistantRouter.use(requireAssistantToken);

assistantRouter.get("/todo/today", async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const tasks = await Task.find(
      ownedQuery(req, {
        deletedAt: null,
        dueDate: { $gte: start, $lt: end },
      })
    );

    return res.json({ tasks: sortTasksForAssistant(tasks) });
  } catch (err) {
    return sendServerError(res, "Error fetching today's tasks", err);
  }
});

assistantRouter.get("/todo/high-priority", async (req, res) => {
  try {
    const tasks = await Task.find(
      ownedQuery(req, {
        deletedAt: null,
        completed: false,
        priority: "high",
      })
    );

    return res.json({ tasks: sortTasksForAssistant(tasks) });
  } catch (err) {
    return sendServerError(res, "Error fetching high-priority tasks", err);
  }
});

assistantRouter.get("/todo/search", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) return res.status(400).json({ message: "q is required" });

    const tasks = await Task.find(
      ownedQuery(req, {
        deletedAt: null,
        text: { $regex: escapeRegExp(query), $options: "i" },
      })
    ).limit(25);

    return res.json({ tasks: sortTasksForAssistant(tasks) });
  } catch (err) {
    return sendServerError(res, "Error searching tasks", err);
  }
});

assistantRouter.get("/todo/tasks", async (req, res) => {
  try {
    const query = buildTaskQuery(req);
    if (!query) return badObjectId(res);

    const tasks = await Task.find(query);
    return res.json({ tasks: sortTasksForAssistant(tasks) });
  } catch (err) {
    return sendServerError(res, "Error fetching tasks", err);
  }
});

assistantRouter.post("/todo/tasks", async (req, res) => {
  try {
    const spaceId = req.body.spaceId || null;
    if (!(await userOwnsSpace(req.user.id, spaceId))) {
      return res.status(400).json({ message: "Invalid spaceId" });
    }

    const task = new Task({
      userId: req.user.id,
      text: req.body.text,
      completed: req.body.completed || false,
      spaceId,
      dueDate: req.body.dueDate || null,
      priority: req.body.priority || "none",
      deletedAt: null,
    });

    await task.save();
    return res.status(201).json({ task });
  } catch (err) {
    return sendServerError(res, "Error creating task", err);
  }
});

assistantRouter.put("/todo/tasks/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    if ("spaceId" in req.body && !(await userOwnsSpace(req.user.id, req.body.spaceId))) {
      return res.status(400).json({ message: "Invalid spaceId" });
    }

    const task = await Task.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      taskUpdateFromBody(req.body),
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json({ task });
  } catch (err) {
    return sendServerError(res, "Error updating task", err);
  }
});

assistantRouter.put("/todo/tasks/:id/complete", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const task = await Task.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      { completed: true },
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json({ task });
  } catch (err) {
    return sendServerError(res, "Error completing task", err);
  }
});

assistantRouter.put("/todo/tasks/:id/restore", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const task = await Task.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      { deletedAt: null },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json({ task });
  } catch (err) {
    return sendServerError(res, "Error restoring task", err);
  }
});

assistantRouter.delete("/todo/tasks/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const task = await Task.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      { deletedAt: Date.now() },
      { new: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json({ message: "Task soft-deleted", task });
  } catch (err) {
    return sendServerError(res, "Error deleting task", err);
  }
});

assistantRouter.get("/todo/spaces", async (req, res) => {
  try {
    const spaces = await Space.find(ownedQuery(req)).sort({ name: 1 });
    return res.json({ spaces });
  } catch (err) {
    return sendServerError(res, "Error fetching spaces", err);
  }
});

assistantRouter.post("/todo/spaces", async (req, res) => {
  try {
    const space = new Space({ userId: req.user.id, name: req.body.name });
    await space.save();
    return res.status(201).json({ space });
  } catch (err) {
    return sendServerError(res, "Error creating space", err);
  }
});

assistantRouter.put("/todo/spaces/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const space = await Space.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      { name: req.body.name, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!space) return res.status(404).json({ message: "Space not found" });
    return res.json({ space });
  } catch (err) {
    return sendServerError(res, "Error updating space", err);
  }
});

assistantRouter.delete("/todo/spaces/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const space = await Space.findOneAndDelete(ownedQuery(req, { _id: req.params.id }));
    if (!space) return res.status(404).json({ message: "Space not found" });

    await Task.updateMany(
      ownedQuery(req, { spaceId: req.params.id }),
      { deletedAt: Date.now() }
    );

    return res.json({ message: "Space deleted and tasks soft-deleted", space });
  } catch (err) {
    return sendServerError(res, "Error deleting space", err);
  }
});

assistantRouter.get("/todo/tasks/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const task = await Task.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!task) return res.status(404).json({ message: "Task not found" });

    return res.json({ task });
  } catch (err) {
    return sendServerError(res, "Error fetching task details", err);
  }
});

assistantRouter.get("/todo/tasks/:id/sublists", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    if (!(await userOwnsTask(req.user.id, req.params.id))) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subLists = await SubList.find(ownedQuery(req, { taskId: req.params.id }));
    return res.json({ subLists });
  } catch (err) {
    return sendServerError(res, "Error fetching task sub-lists", err);
  }
});

assistantRouter.post("/todo/tasks/:id/sublists", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    if (!(await userOwnsTask(req.user.id, req.params.id))) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subList = new SubList({
      userId: req.user.id,
      taskId: req.params.id,
      name: req.body.name || "New List",
    });

    await subList.save();
    return res.status(201).json({ subList });
  } catch (err) {
    return sendServerError(res, "Error creating sub-list", err);
  }
});

assistantRouter.get("/todo/sublists/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    return res.json({ subList });
  } catch (err) {
    return sendServerError(res, "Error fetching sub-list", err);
  }
});

assistantRouter.put("/todo/sublists/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const subList = await SubList.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      { name: req.body.name },
      { new: true, runValidators: true }
    );

    if (!subList) return res.status(404).json({ message: "Sub-list not found" });
    return res.json({ subList });
  } catch (err) {
    return sendServerError(res, "Error updating sub-list", err);
  }
});

assistantRouter.delete("/todo/sublists/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const subList = await SubList.findOneAndDelete(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    return res.json({ message: "Sub-list deleted", subList });
  } catch (err) {
    return sendServerError(res, "Error deleting sub-list", err);
  }
});

assistantRouter.post("/todo/sublists/:id/items", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    subList.items.push({
      text: req.body.text || "Untitled",
      completed: req.body.completed || false,
      priority: req.body.priority || "none",
      dueTime: req.body.dueTime || "",
    });

    await subList.save();
    return res.status(201).json({ subList });
  } catch (err) {
    return sendServerError(res, "Error adding sub-list item", err);
  }
});

assistantRouter.put("/todo/sublists/:id/items/:itemId", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.itemId)) {
      return badObjectId(res);
    }

    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const item = subList.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.text = req.body.text ?? item.text;
    item.priority = req.body.priority ?? item.priority;
    item.dueTime = req.body.dueTime ?? item.dueTime;
    if (typeof req.body.completed === "boolean") {
      item.completed = req.body.completed;
    }

    await subList.save();
    return res.json({ subList });
  } catch (err) {
    return sendServerError(res, "Error updating sub-list item", err);
  }
});

assistantRouter.delete("/todo/sublists/:id/items/:itemId", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.itemId)) {
      return badObjectId(res);
    }

    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const item = subList.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    subList.items.pull(req.params.itemId);
    await subList.save();

    return res.json({ subList });
  } catch (err) {
    return sendServerError(res, "Error deleting sub-list item", err);
  }
});

app.use("/assistant", assistantRouter);

app.get("/tasks", async (req, res) => {
  try {
    const { spaceId } = req.query;

    if (spaceId === "DELETED") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const tasks = await Task.find(
        ownedQuery(req, { deletedAt: { $ne: null, $gte: thirtyDaysAgo } })
      ).sort({ deletedAt: -1 });
      return res.json(tasks);
    }

    const query = ownedQuery(req, { deletedAt: null });
    if (spaceId && spaceId !== "ALL") {
      if (!isValidObjectId(spaceId)) return badObjectId(res);
      query.spaceId = spaceId;
    }

    const tasks = await Task.find(query);
    return res.json(tasks);
  } catch (err) {
    return sendServerError(res, "Error fetching tasks", err);
  }
});

app.get("/tasks/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    const task = await Task.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json(task);
  } catch (err) {
    return sendServerError(res, "Error fetching task", err);
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const spaceId = req.body.spaceId || null;
    if (!(await userOwnsSpace(req.user.id, spaceId))) {
      return res.status(400).json({ message: "Invalid spaceId" });
    }

    const task = new Task({
      userId: req.user.id,
      text: req.body.text,
      completed: req.body.completed || false,
      spaceId,
      dueDate: req.body.dueDate || null,
      priority: req.body.priority || "none",
      deletedAt: null,
    });

    await task.save();
    return res.status(201).json(task);
  } catch (err) {
    return sendServerError(res, "Error saving task", err);
  }
});

app.put("/tasks/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const updatedData = {
      text: req.body.text,
      completed: req.body.completed,
      dueDate: req.body.dueDate,
      priority: req.body.priority,
    };

    if ("spaceId" in req.body) {
      if (!(await userOwnsSpace(req.user.id, req.body.spaceId))) {
        return res.status(400).json({ message: "Invalid spaceId" });
      }
      updatedData.spaceId = req.body.spaceId || null;
    }

    const task = await Task.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      updatedData,
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json(task);
  } catch (err) {
    return sendServerError(res, "Error updating task", err);
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    const task = await Task.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      { deletedAt: Date.now() },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json({ message: "Task soft-deleted", task });
  } catch (err) {
    return sendServerError(res, "Error deleting task", err);
  }
});

app.put("/tasks/:id/restore", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    const task = await Task.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      { deletedAt: null },
      { new: true }
    );
    if (!task) return res.status(404).json({ message: "Task not found" });
    return res.json({ message: "Task restored", task });
  } catch (err) {
    return sendServerError(res, "Error restoring task", err);
  }
});

app.get("/spaces", async (req, res) => {
  try {
    const spaces = await Space.find(ownedQuery(req));
    return res.json(spaces);
  } catch (err) {
    return sendServerError(res, "Error fetching spaces", err);
  }
});

app.post("/spaces", async (req, res) => {
  try {
    const space = new Space({ userId: req.user.id, name: req.body.name });
    await space.save();
    return res.status(201).json(space);
  } catch (err) {
    return sendServerError(res, "Error creating space", err);
  }
});

app.delete("/spaces/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);

    const space = await Space.findOneAndDelete(ownedQuery(req, { _id: req.params.id }));
    if (!space) return res.status(404).json({ message: "Space not found" });

    await Task.updateMany(
      ownedQuery(req, { spaceId: req.params.id }),
      { deletedAt: Date.now() }
    );

    return res.json({ message: "Space and tasks deleted" });
  } catch (err) {
    return sendServerError(res, "Error deleting space", err);
  }
});

app.get("/sublists", async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) return res.status(400).json({ message: "taskId is required" });
    if (!(await userOwnsTask(req.user.id, taskId))) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subLists = await SubList.find(ownedQuery(req, { taskId }));
    return res.json(subLists);
  } catch (err) {
    return sendServerError(res, "Error fetching sub-lists", err);
  }
});

app.post("/sublists", async (req, res) => {
  try {
    const { taskId, name } = req.body;
    if (!taskId) {
      return res.status(400).json({ message: "taskId is required to create a sub-list" });
    }
    if (!(await userOwnsTask(req.user.id, taskId))) {
      return res.status(404).json({ message: "Task not found" });
    }

    const subList = new SubList({
      userId: req.user.id,
      taskId,
      name: name || "New List",
    });

    await subList.save();
    return res.status(201).json(subList);
  } catch (err) {
    return sendServerError(res, "Error creating sub-list", err);
  }
});

app.get("/sublists/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });
    return res.json(subList);
  } catch (err) {
    return sendServerError(res, "Error fetching sub-list", err);
  }
});

app.put("/sublists/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    const updatedData = {
      name: req.body.name,
      priority: req.body.priority,
      dueDate: req.body.dueDate,
      completed: req.body.completed,
    };

    const subList = await SubList.findOneAndUpdate(
      ownedQuery(req, { _id: req.params.id }),
      updatedData,
      { new: true, runValidators: true }
    );

    if (!subList) return res.status(404).json({ message: "Sub-list not found" });
    return res.json(subList);
  } catch (err) {
    return sendServerError(res, "Error updating sub-list", err);
  }
});

app.delete("/sublists/:id", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    const subList = await SubList.findOneAndDelete(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });
    return res.json({ message: "Sub-list deleted", subList });
  } catch (err) {
    return sendServerError(res, "Error deleting sub-list", err);
  }
});

app.post("/sublists/:id/items", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return badObjectId(res);
    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    subList.items.push({
      text: req.body.text || "Untitled",
      completed: false,
      priority: req.body.priority || "none",
      dueTime: req.body.dueTime || "",
    });

    await subList.save();
    return res.status(201).json(subList);
  } catch (err) {
    return sendServerError(res, "Error adding sub-list item", err);
  }
});

app.put("/sublists/:id/items/:itemId", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.itemId)) {
      return badObjectId(res);
    }

    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const item = subList.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    item.text = req.body.text ?? item.text;
    item.priority = req.body.priority ?? item.priority;
    item.dueTime = req.body.dueTime ?? item.dueTime;
    if (typeof req.body.completed === "boolean") {
      item.completed = req.body.completed;
    }

    await subList.save();
    return res.json(subList);
  } catch (err) {
    return sendServerError(res, "Error updating sub-list item", err);
  }
});

app.delete("/sublists/:id/items/:itemId", async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.itemId)) {
      return badObjectId(res);
    }

    const subList = await SubList.findOne(ownedQuery(req, { _id: req.params.id }));
    if (!subList) return res.status(404).json({ message: "Sub-list not found" });

    const item = subList.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: "Item not found" });

    subList.items.pull(req.params.itemId);
    await subList.save();

    return res.json(subList);
  } catch (err) {
    return sendServerError(res, "Error deleting sub-list item", err);
  }
});

const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || "127.0.0.1";
app.listen(PORT, HOST, () => console.log(`Server running on http://${HOST}:${PORT}`));
