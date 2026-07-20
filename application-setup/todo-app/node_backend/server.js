require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 4000;

// =====================
// Middleware
// =====================

app.use(helmet());
app.use(compression());

app.use(cors({
    origin: "*",
    methods: ["GET","POST","PUT","DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// =====================
// MySQL Pool
// =====================

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// =====================
// Initialize Database
// =====================

async function initDatabase() {

    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });

    await conn.query(
        `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``
    );

    await conn.end();

    await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (

            id INT AUTO_INCREMENT PRIMARY KEY,

            title VARCHAR(255) NOT NULL,

            description TEXT DEFAULT NULL,

            date VARCHAR(30) NULL,

            priority ENUM('Low','Medium','High')
                DEFAULT 'Medium',

            category VARCHAR(100)
                DEFAULT 'General',

            done BOOLEAN DEFAULT FALSE,

            created_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP,

            updated_at TIMESTAMP
                DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP

        )
    `);

    console.log("Database Ready");
}

// =====================
// Validation
// =====================

function validateTask(body) {

    if (!body.title || body.title.trim() === "") {
        return "Title is required";
    }

    return null;
}

// =====================
// Health
// =====================

app.get("/health", async (req, res) => {

    try {

        await pool.query("SELECT 1");

        res.json({
            status: "ok",
            database: "connected",
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        });

    } catch {

        res.status(500).json({
            status: "error",
            database: "disconnected"
        });

    }

});

// =====================
// GET ALL TASKS
// =====================

app.get("/tasks", async (req, res) => {

    try {

        const [rows] = await pool.query(
            "SELECT * FROM tasks ORDER BY id DESC"
        );

        rows.forEach(task => {
            task.done = !!task.done;
        });

        res.json(rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Failed to load tasks"
        });

    }

});

// =====================
// GET ONE TASK
// =====================

app.get("/tasks/:id", async (req, res) => {

    try {

        const [rows] = await pool.query(
            "SELECT * FROM tasks WHERE id=?",
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        rows[0].done = !!rows[0].done;

        res.json(rows[0]);

    } catch {

        res.status(500).json({
            message: "Server error"
        });

    }

});

// =====================
// CREATE TASK
// =====================

app.post("/tasks", async (req, res) => {

    const error = validateTask(req.body);

    if (error) {
        return res.status(400).json({
            message: error
        });
    }

    const {

        title,
        description = "",
        date = formatDate(req.body.date) || null,
        priority = "Medium",
        category = "General",
        done = false

    } = req.body;

    try {

        const [result] = await pool.query(

            `INSERT INTO tasks
            (title,description,date,priority,category,done)
            VALUES (?,?,?,?,?,?)`,

            [
                title.trim(),
                description,
                date || null,
                priority,
                category,
                done ? 1 : 0
            ]

        );

        const [rows] = await pool.query(
            "SELECT * FROM tasks WHERE id=?",
            [result.insertId]
        );

        rows[0].done = !!rows[0].done;

        res.status(201).json(rows[0]);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Unable to create task"
        });

    }

});
function formatDate(date) {
    if (!date) return null;

    return new Date(date)
        .toISOString()
        .split("T")[0];
}
// =====================
// UPDATE TASK
// =====================

app.put("/tasks/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid task id"
        });
    }

    const error = validateTask(req.body);

    if (error) {
        return res.status(400).json({
            message: error
        });
    }

    const {
        title,
        description = "",
        date = null,
        priority = "Medium",
        category = "General",
        done = false
    } = req.body;

    try {
        const [exists] = await pool.query(
            "SELECT id FROM tasks WHERE id=?",
            [id]
        );

        if (!exists.length) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        await pool.query(
            `UPDATE tasks
             SET
                title=?,
                description=?,
                date=?,
                priority=?,
                category=?,
                done=?
             WHERE id=?`,
            [
                title.trim(),
                description,
                date || null,
                priority,
                category,
                done ? 1 : 0,
                id
            ]
        );

        const [rows] = await pool.query(
            "SELECT * FROM tasks WHERE id=?",
            [id]
        );

        rows[0].done = !!rows[0].done;

        res.json(rows[0]);

    } catch (err) {
        console.error(err);

        res.status(500).json({
            message: "Unable to update task"
        });
    }
});

// =====================
// DELETE TASK
// =====================

app.delete("/tasks/:id", async (req, res) => {

    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: "Invalid task id"
        });
    }

    try {

        const [result] = await pool.query(
            "DELETE FROM tasks WHERE id=?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json({
            success: true,
            message: "Task deleted"
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            message: "Unable to delete task"
        });

    }

});

// =====================
// 404
// =====================

app.use((req, res) => {
    res.status(404).json({
        message: "Route not found"
    });
});

// =====================
// Global Error Handler
// =====================

app.use((err, req, res, next) => {

    console.error(err);

    res.status(500).json({
        message: "Internal Server Error"
    });

});

// =====================
// Start Server
// =====================

async function startServer() {

    try {

        await initDatabase();

        app.listen(PORT, () => {
            console.log(`====================================`);
            console.log(`Server running on port ${PORT}`);
            console.log(`Health : http://127.0.0.1:${PORT}/health`);
            console.log(`Tasks  : http://127.0.0.1:${PORT}/tasks`);
            console.log(`====================================`);
        });

    } catch (err) {

        console.error("Failed to start server");
        console.error(err);

        process.exit(1);

    }

}

startServer();

// =====================
// Graceful Shutdown
// =====================

async function shutdown(signal) {

    console.log(`${signal} received`);

    try {

        await pool.end();

        console.log("MySQL pool closed");

        process.exit(0);

    } catch (err) {

        console.error(err);

        process.exit(1);

    }

}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", err => {
    console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", err => {
    console.error("Uncaught Exception:", err);
});
