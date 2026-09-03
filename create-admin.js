const bcrypt = require("bcryptjs");
const db = require("./database");

const name = "مسؤول النظام";
const username = "مسؤول";
const password = "19942003";

bcrypt.hash(password, 10, (err, hashedPassword) => {
if (err) { console.error(err); return; }
db.run( "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)", [name, username, hashedPassword, "admin"], function(err) {
    if (err) {
        console.error("خطأ:", err.message);
    } else {
        console.log("تم إنشاء حساب المسؤول بنجاح");
    }

    db.close();
}
);
});