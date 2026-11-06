import mongoose from 'mongoose';

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, default: '', trim: true, index: true },
    address: { type: String, default: '', trim: true },
    operator: { type: String, default: '', trim: true },

    power: { type: Number, required: true },        // kW
    price: { type: Number, required: true },        // ₹ per kWh
    reliability: { type: Number, default: 90, min: 0, max: 100 },
    queue: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['Available', 'Busy', 'Offline'], default: 'Available' },
    connectors: { type: [String], default: ['CCS2'] },
    amenities: { type: [String], default: [] },
    type: { type: String, enum: ['Urban', 'Highway'], default: 'Urban' },
    source: { type: String, default: 'seed' },
    externalId: { type: String, index: true, sparse: true },

    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    // GeoJSON point – this is what makes "nearest stations" fast ($geoNear + 2dsphere index)
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
  },
  { timestamps: true }
);

stationSchema.pre('validate', function () {
  if (!this.location?.coordinates?.length && this.latitude != null && this.longitude != null) {
    this.location = { type: 'Point', coordinates: [this.longitude, this.latitude] };
  }
});

stationSchema.index({ location: '2dsphere' });

export default mongoose.model('Station', stationSchema);
