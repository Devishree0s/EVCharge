import mongoose from 'mongoose';
const stationSchema=new mongoose.Schema({name:{type:String,required:true},power:{type:Number,required:true},price:{type:Number,required:true},reliability:{type:Number,default:100},queue:{type:Number,default:0},status:{type:String,default:'Available'},connector:{type:String,default:'CCS2'},latitude:{type:Number,default:12.9716},longitude:{type:Number,default:77.5946}},{timestamps:true});
export default mongoose.model('Station',stationSchema);
