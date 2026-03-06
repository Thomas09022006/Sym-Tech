# InnovateX Quiz Platform — Full-Stack Setup Guide

A full-stack technical quiz platform built with **Flask**, **MySQL**, and vanilla HTML/CSS/JS.

## 📁 Project Structure

```
Sym-Tech/
├── frontend/              ← Static frontend (served by Flask)
│   ├── index.html
│   ├── css/style.css
│   ├── js/script.js
│   └── Logo.png
├── backend/               ← Flask API server
│   ├── app.py             ← Entry point
│   ├── config.py          ← MySQL + app config
│   ├── models/            ← SQLAlchemy ORM models
│   └── routes/            ← REST API blueprints
├── database/
│   └── schema.sql         ← MySQL DDL
├── requirements.txt
└── README.md
```

---

## 🛠 Prerequisites

- **Python 3.10+**
- **MySQL 8.0+** (or MariaDB)
- **pip** (Python package manager)

---

## ⚡ Quick Start

### 1. Create the MySQL Database

Open a MySQL terminal and run:

```sql
CREATE DATABASE innovatex_quiz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or import the full schema:

```bash
mysql -u root -p < database/schema.sql
```

### 2. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Database Connection (Optional)

By default, the app connects to MySQL as `root` with **no password** on `localhost:3306`.

To customize, create a `.env` file in the project root:

```env
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DB=innovatex_quiz
ADMIN_PASSWORD=admin123
```

### 4. Seed Default Questions (Optional)

To load the 40 built-in questions into MySQL:

```bash
python seed_questions.py
```

### 5. Run the Server

```bash
python backend/app.py
```

The app starts at: **http://localhost:5000**

---

## 🌐 API Endpoints

| Method   | Endpoint                    | Description                   |
|----------|-----------------------------|-------------------------------|
| `POST`   | `/api/v1/registrations`     | Register a participant        |
| `GET`    | `/api/v1/registrations`     | List all registrations        |
| `DELETE` | `/api/v1/registrations`     | Clear all registrations       |
| `GET`    | `/api/v1/questions`         | List all questions            |
| `POST`   | `/api/v1/questions`         | Add a question                |
| `PUT`    | `/api/v1/questions/<id>`    | Update a question             |
| `DELETE` | `/api/v1/questions/<id>`    | Delete a question             |
| `POST`   | `/api/v1/quiz/start`        | Start quiz (get questions)    |
| `POST`   | `/api/v1/quiz/submit`       | Submit quiz answers           |
| `GET`    | `/api/v1/results`           | Get leaderboard               |
| `DELETE` | `/api/v1/results`           | Clear all results             |
| `DELETE` | `/api/v1/results/attempts`  | Reset all quiz attempts       |
| `GET`    | `/api/v1/settings`          | Get quiz settings             |
| `PUT`    | `/api/v1/settings`          | Update quiz settings          |
| `POST`   | `/api/v1/admin/login`       | Verify admin password         |

---

## 🔐 Admin Access

- Default password: `admin123`
- Change via `.env` file: `ADMIN_PASSWORD=your_new_password`

---

## 🧪 Testing the API

You can test endpoints with `curl`:

```bash
# Register a participant
curl -X POST http://localhost:5000/api/v1/registrations \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","roll":"22CS101","year":"II Year","dept":"CSE"}'

# Get leaderboard
curl http://localhost:5000/api/v1/results
```
