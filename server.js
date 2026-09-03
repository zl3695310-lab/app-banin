const express = require("express");
const db = require("./database");
const path = require("path");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const multer = require("multer");

const app = express();
const PORT = 3000;

const storage = multer.diskStorage({
destination: function(req, file, cb) {
cb(null, "public/uploads/");
},
filename: function(req, file, cb) {
const extension = path.extname(file.originalname);
cb(null, Date.now() + extension);
}
});

const upload = multer({ storage: storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
secret: "expenses-system-secret",
resave: false,
saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
const { username, password } = req.body;
db.get( "SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) {
        console.error(err.message);
        return res.send("حدث خطأ في النظام");
    }

    if (!user) {
        return res.send("اسم المستخدم أو كلمة المرور غير صحيحة");
    }

    bcrypt.compare(password, user.password, (err, result) => {

        if (err) {
            console.error(err.message);
            return res.send("حدث خطأ في النظام");
        }

        if (!result) {
            return res.send("اسم المستخدم أو كلمة المرور غير صحيحة");
        }

        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;

        if (user.role === "admin") {
            res.redirect("/admin.html");
        } else {
            res.redirect("/employee.html");
        }
    });
}
);
});

app.post("/add-employee", (req, res) => {
const { name, username, password, confirmPassword } = req.body;
if (password !== confirmPassword) { return res.send("كلمتا المرور غير متطابقتين"); }
bcrypt.hash(password, 10, (err, hashedPassword) => {
if (err) {
    console.error(err.message);
    return res.send("حدث خطأ أثناء تشفير كلمة المرور");
}

db.run(
    "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
    [name, username, hashedPassword, "employee"],
    function(err) {

        if (err) {
            console.error(err.message);

            if (err.message.includes("UNIQUE")) {
                return res.send("اسم المستخدم موجود مسبقاً");
            }

            return res.send("حدث خطأ أثناء إضافة الموظف");
        }

        res.send("تمت إضافة الموظف بنجاح");
    }
);
});
});

app.post("/add-expense", upload.single("image"), (req, res) => {
if (!req.session.userId || req.session.role !== "employee") { return res.send("غير مسموح"); }
const { amount, description, expense_date } = req.body; const image = req.file ? "/uploads/" + req.file.filename : null;
if (!amount || !expense_date) { return res.send("يرجى إدخال مبلغ المصروف والتاريخ"); }
db.run( "INSERT INTO expenses (employee_id, amount, description, expense_date, image) VALUES (?, ?, ?, ?, ?)", [req.session.userId, amount, description, expense_date, image], function(err) {
    if (err) {
        console.error(err.message);
        return res.send("حدث خطأ أثناء حفظ المصروف");
    }

    res.send("تم حفظ المصروف بنجاح");
}
);
});

app.get("/my-expenses", (req, res) => {
if (!req.session.userId || req.session.role !== "employee") { return res.status(403).json([]); }
db.all("SELECT id, amount, description, expense_date, image FROM expenses WHERE employee_id = ? ORDER BY expense_date DESC, id DESC", [req.session.userId], (err, expenses) => {
    if (err) {
        console.error(err.message);
        return res.status(500).json([]);
    }

    res.json(expenses);
}
);
});

app.get("/employees", (req, res) => {
if (!req.session.userId || req.session.role !== "admin") { return res.status(403).json([]); }
db.all( "SELECT id, name, username FROM users WHERE role = 'employee' ORDER BY id DESC", (err, employees) => {
    if (err) {
        console.error(err.message);
        return res.status(500).json([]);
    }

    res.json(employees);
}
);
});
app.get("/all-expenses", (req, res) => {
if (!req.session.userId || req.session.role !== "admin") { return res.status(403).json([]); }
db.all( "SELECT expenses.id, expenses.amount, expenses.description, expenses.expense_date, expenses.image, users.name AS employee_name FROM expenses JOIN users ON expenses.employee_id = users.id ORDER BY expenses.expense_date DESC, expenses.id DESC", (err, expenses) => {
    if (err) {
        console.error(err.message);
        return res.status(500).json([]);
    }

    res.json(expenses);
}
);
});
app.post("/admin/delete-expense", (req, res) => {
if (!req.session.userId || req.session.role !== "admin") { return res.status(403).json({ success: false, message: "غير مسموح" }); }
const expenseId = req.body.id;
if (!expenseId) { return res.status(400).json({ success: false, message: "رقم المصروف غير موجود" }); }
db.run( "DELETE FROM expenses WHERE id = ?", [expenseId], function(err) {
    if (err) {
        console.error(err.message);
        return res.status(500).json({ success: false, message: "حدث خطأ أثناء حذف المصروف" });
    }

    res.json({ success: true, message: "تم حذف المصروف بنجاح" });
}
);
});
app.get("/expense/:id", (req, res) => {
if (!req.session.userId || req.session.role !== "admin") { return res.status(403).json({ success: false, message: "غير مسموح" }); }
db.get( "SELECT id, amount, description, expense_date FROM expenses WHERE id = ?", [req.params.id], (err, expense) => {
    if (err) {
        console.error(err.message);
        return res.status(500).json({ success: false, message: "حدث خطأ في النظام" });
    }

    if (!expense) {
        return res.status(404).json({ success: false, message: "المصروف غير موجود" });
    }

    res.json(expense);
}
);
});
app.post("/admin/update-expense", (req, res) => {
if (!req.session.userId || req.session.role !== "admin") { return res.status(403).json({ success: false, message: "غير مسموح" }); }
const { id, amount, description, expense_date } = req.body;
if (!id || !amount ||!expense_date) { return res.status(400).json({ success: false, message: "يرجى إدخال المبلغ والتاريخ" }); }
db.run( "UPDATE expenses SET amount = ?, description = ?, expense_date = ? WHERE id = ?", [amount, description, expense_date, id], function(err) {
    if (err) {
        console.error(err.message);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تعديل المصروف"
        });
    }

    res.json({
        success: true,
        message: "تم تعديل المصروف بنجاح"
    });
}
);
});
app.listen(PORT, () => {
console.log("الموقع يعمل على http://localhost:" + PORT);
});