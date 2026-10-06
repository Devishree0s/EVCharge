import dns from 'dns';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Station from './models/Station.js';import Report from './models/Report.js';
dotenv.config();

dns.setServers(['8.8.8.8', '1.1.1.1']);
const app=express();
app.use(cors());
app.use(express.json());
mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log('MongoDB connected'))
.catch(e=>console.error('MongoDB connection failed:',e.message));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'EVCharge API'}));
app.post('/api/seed-stations',async(req,res)=>{try{await Station.deleteMany({});const stations=await Station.insertMany([{name:'GreenVolt Central',power:120,price:18,reliability:97,queue:6,status:'Available',connector:'CCS2',latitude:12.9716,longitude:77.5946},{name:'ChargePoint Metro',power:60,price:15,reliability:92,queue:9,status:'Available',connector:'CCS2',latitude:12.9352,longitude:77.6245},{name:'Highway FastCharge',power:180,price:24,reliability:88,queue:14,status:'Busy',connector:'CCS2',latitude:13.0174,longitude:77.5962},{name:'EcoCharge Mall',power:30,price:12,reliability:79,queue:3,status:'Available',connector:'Type 2',latitude:12.9141,longitude:77.6101}]);res.json({message:'Stations added successfully',stations})}catch(e){res.status(500).json({error:'Failed to add stations'})}});
app.get('/api/stations',async(req,res)=>{try{res.json(await Station.find({}).sort({reliability:-1}))}catch(e){res.status(500).json({error:'Failed to fetch stations'})}});
app.get('/api/stations/:id',async(req,res)=>{try{const s=await Station.findById(req.params.id);if(!s)return res.status(404).json({error:'Station not found'});res.json(s)}catch(e){res.status(500).json({error:'Failed to fetch station'})}});
app.post('/api/stations/:id/reports',async(req,res)=>{try{const {type,message}=req.body;const s=await Station.findById(req.params.id);if(!s)return res.status(404).json({error:'Station not found'});if(!type||!message)return res.status(400).json({error:'Report type and message are required'});const report=await Report.create({stationId:s._id,type,message});res.status(201).json({message:'Report submitted successfully',report})}catch(e){res.status(500).json({error:'Failed to submit report'})}});
app.get('/api/stations/:id/reports',async(req,res)=>{try{const s=await Station.findById(req.params.id);if(!s)return res.status(404).json({error:'Station not found'});res.json(await Report.find({stationId:s._id}).sort({createdAt:-1}))}catch(e){res.status(500).json({error:'Failed to fetch reports'})}});
app.listen(4000,()=>console.log('EVCharge API running on http://localhost:4000'));
