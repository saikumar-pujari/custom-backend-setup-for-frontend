# 🚀 Backend Template (Django + DRF)
>redis and celery will be added in future updates with nginx and gunicorn configuration for production deployment.
A plug-and-play **backend-only template** built using Django & Django REST Framework including the elastic search integration.

This project is designed so that **any frontend (React, Vue, Angular, etc.) can directly connect via APIs** using CORS — no need to build backend from scratch every time.

---

## 🔥 Features

* 🔐 Authentication system (JWT / Token based)
* 👤 User management (Register, Login, Profile)
* 🌐 CORS enabled (connect any frontend easily)
* ⚙️ Environment-based config using `.env`
* 🧩 Modular app structure (scalable)
* 📦 Ready-to-use API endpoints
* 🚀 Deployment ready (Render / Railway / etc.)

---

## 📁 Project Structure

```
project/
│
├── apps/
│   ├── accounts/      # User authentication
│   ├── products/      # Example app
│   └── ...
│
├── core/
│   ├── settings.py
│   ├── urls.py
│   └── ...
│
├── .env               # Environment variables
├── manage.py
└── requirements.txt
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the repo

```bash
git clone https://github.com/your-username/backend-template.git
cd backend-template
```

---

### 2️⃣ Create virtual environment

```bash
python -m venv env
source env/bin/activate   # Linux/Mac
env\Scripts\activate      # Windows
```

---

### 3️⃣ Install dependencies

```bash
pip install -r requirements.txt
```

---

### 4️⃣ Setup `.env`

Create a `.env` file in root:

```
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Database (optional)
DB_NAME=your_db
DB_USER=your_user
DB_PASSWORD=your_password
```

---

### 5️⃣ Run migrations

```bash
python manage.py migrate
```

---

### 6️⃣ Run server

```bash
uvicorn backend_template.asgi:application --reload
```

---

## 🌐 Connecting Frontend (IMPORTANT 🔥)

This backend is designed to be used with any frontend.

### Enable CORS

Make sure CORS is enabled in settings:

```python
CORS_ALLOW_ALL_ORIGINS = True   # For development
```

OR for production:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://yourfrontend.com"
]
```

---

### Example API Usage

Frontend can call APIs like:

```
GET    /api/products/
POST   /api/accounts/login/
POST   /api/accounts/register/
```

Example (React):

```javascript
fetch("http://127.0.0.1:8000/api/products/")
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 🔐 Authentication

* Token / JWT based authentication
* Send token in headers:

```
Authorization: Bearer <your-token>
```

---

## 🧩 Customization

You can:

* Add/remove apps from `apps/`
* Modify models & APIs
* Plug into any frontend
* Extend authentication system

---

## 🚀 Deployment

You can deploy easily on:

* Render
* Railway
* AWS
* VPS

Make sure to:

* Set `DEBUG=False`
* Add correct `ALLOWED_HOSTS`
* Configure database

---

## 💡 Goal of this Project

To provide a **reusable backend system** where:

👉 Frontend developers can directly connect
👉 No need to build backend from scratch
👉 Faster development & scalability

---

## 🤝 Contribution

Feel free to fork and improve this template.

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

---

## 👨‍💻 Author

Built with ❤️ for developers who want fast backend setup.
