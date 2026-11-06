const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log('DB Error: ', err));

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  reward: { type: Number, required: true },
  link: { type: String },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});
const Job = mongoose.model('Job', JobSchema);

app.get('/', (req, res) => {
  res.send('BD JOB HUB Backend is Running perfectly!');
});

app.post('/api/register', async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
    let user = await User.findOne({ phone });
    if (user) return res.status(400).json({ message: 'এই মোবাইল নম্বর দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে।' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({ name, phone, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'রেজিস্ট্রেশন সফল হয়েছে!' });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার এরর', error: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(400).json({ message: 'ভুল মোবাইল নম্বর বা পাসওয়ার্ড।' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ message: 'ভুল মোবাইল নম্বর বা পাসওয়ার্ড।' });

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '7d' });
    res.json({ message: 'লগইন সফল!', token, user: { id: user._id, name: user.name, balance: user.balance } });
  } catch (err) {
    res.status(500).json({ message: 'সার্ভার এরর', error: err.message });
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const { title, description, reward, link, postedBy } = req.body;
    const newJob = new Job({ title, description, reward, link, postedBy });
    await newJob.save();
    res.status(201).json({ message: 'জব পোস্ট সফল হয়েছে!', job: newJob });
  } catch (err) {
    res.status(500).json({ message: 'জব পোস্ট করা যায়নি', error: err.message });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ message: 'জব লোড করা যায়নি', error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
