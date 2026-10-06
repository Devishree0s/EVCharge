import mongoose from 'mongoose';
const reportSchema=new mongoose.Schema({stationId:{type:mongoose.Schema.Types.ObjectId,ref:'Station',required:true},type:{type:String,required:true},message:{type:String,required:true}},{timestamps:true});
export default mongoose.model('Report',reportSchema);
