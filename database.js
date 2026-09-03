const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./expenses.db", (err) => {
if (err) {
console.error("Database connection error:", err.message);
} else {
console.log("Connected to SQLite database.");
}
});

db.serialize(() => {

db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'employee')");
db.run("CREATE TABLE IF NOT EXISTS expenses (id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id INTEGER NOT NULL, amount REAL NOT NULL, description TEXT, expense_date TEXT NOT NULL, image TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (employee_id) REFERENCES users(id))");
db.all("PRAGMA table_info(expenses)", (err, columns) => {
if (err) {
    console.error(err.message);
    return;
}

const imageColumn = columns.find(function(column) {
    return column.name === "image";
});

if (!imageColumn) {
    db.run("ALTER TABLE expenses ADD COLUMN image TEXT", (err) => {

        if (err) {
            console.error(err.message);
        } else {
            console.log("تمت إضافة عمود الصورة بنجاح");
        }

    });
}
});
});

module.exports = db;