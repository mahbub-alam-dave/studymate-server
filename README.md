# Study Mate — Online Study Community Application

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://fir-advance-project.web.app)  ![License](https://img.shields.io/badge/License-MIT-blue)

---

# 📖 Overview

**Study Mate** is an online study-focused web application that provides students with a distraction-free environment to collaborate, participate in assignments, and evaluate peer submissions. With **Firebase Authentication** and role-based access, Study Mate ensures a secure and tailored experience for each user.

* **Guests (not logged in):** Can only view the Home and Assignments pages.
* **Logged-in Students:** Can explore all features — participate in assignments, submit their work, view pending assignments, and evaluate others' submissions.
* **Theme Options:** Custom-designed light and dark modes for a personalized experience.

---

# 🔗 Live Demo & Repositories

* **Live Site:** [https://fir-advance-project.web.app](https://fir-advance-project.web.app)
* **Client Repo:** [GitHub](https://github.com/mahbub-alam-dave/studymate-client.git)
* **Server Repo:** [GitHub](https://github.com/mahbub-alam-dave/studymate-server.git)

---

# 🖼 Screenshot

![Study Mate - Dashboard](./public/study-mate-dashboard.png)

---

# 🛠 Technologies Used

* **Frontend:** HTML, CSS, JavaScript, React.js
* **Backend:** Node.js, Express
* **Database:** MongoDB
* **Authentication:** Firebase Auth (Email/Password, Google Sign-in)
* **UI Animations:** Framer Motion

---

# ✨ Core Features

* 🔐 **Firebase Authentication** — Email/password and Google login.
* 🎯 **Role-Based Access** — Logged-out users see limited content; logged-in users have full control.
* 📝 **Assignment Participation** — View, participate, and submit assignments.
* ⏳ **Pending Assignments** — Track and evaluate submissions awaiting review.
* 🌓 **Light/Dark Mode** — Custom-designed dual theme system.
* 💻 **Responsive Design** — Optimized for mobile, tablet, and desktop.

---

# 📦 Dependencies (high level)

**Client:**

* react
* react-dom
* react-router-dom
* axios
* firebase
* framer-motion
* react-hook-form (if used)
* sweetalert2 (optional)

**Server:**

* express
* mongoose
* dotenv
* cors
* bcryptjs (if used)
* jsonwebtoken (if used)

---

# 🚀 Run Locally — Quick Start

```bash
# 1. Clone repos
# Client
git clone https://github.com/mahbub-alam-dave/studymate-client.git
# Server
git clone https://github.com/mahbub-alam-dave/studymate-server.gitstudy-mate-server

# 2. Install dependencies
cd study-mate-client
npm install
cd ../study-mate-server
npm install
```

### Environment Variables

Create `.env` files in both **client** and **server** with necessary variables.

**Server `.env` example:**

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:3000
```

**Client `.env` example:**

```env
REACT_APP_api_url=http://localhost:5000
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
# ...other firebase config
```

### Start Development

* **Server:**

```bash
cd study-mate-server
npm run dev
```

* **Client:**

```bash
cd study-mate-client
npm start
```

---

# ⚙️ Deployment

**Client:** Firebase Hosting
**Server:** Your preferred hosting (Render, Vercel, Railway, etc.)

---

# 📞 Contact

* **Email:** [mahbubalamdave2.00@gmail.com](mailto:mahbubalamdave2.00@gmail.com)
* **Phone:** [+880 1307594998](tel:+8801307594998)

---

# 🧾 License

MIT License
