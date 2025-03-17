import User from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../../../config/config';
//MALR: API GET
//MALR: All Users
export const getUserList = async (req, res, next) =>{
  try{
    const userList = await User.find();
    if ( userList.length  === 0){
        res.status(404).send({message: 'No found Users'})
    }else if (userList){
        res.status(200).json(userList)
    }
  }catch{
    res.status(500).send({ message: 'Internal Sever Error ', error });
  } 
};

//MALR: API GET
//MALR: One User
export const getUserItem = async (req, res, next) =>{
    try{
        const { id } = req.params;
        const userItem = await await User.findOne({
                    username: id,
                });
        if (!userItem){
            res.status(404).send({message: 'No found User'})
        }else if (userItem){
          res.status(200).json(userItem)
        }
    }catch(error){
        res.status(500).send({ message: 'Internal Sever Error ', error });
    } 
  };

// MALR: Register
export const registerUser = async(req, res) =>{
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ username });
    const existingEmail = await User.findOne({ email });
    if (existingUser || existingEmail) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword, regdate: Date.now()});

    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const loginUser = async(req, res) =>{
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.username }, config.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};