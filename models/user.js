const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, required: true },
    places: [{ type: mongoose.Types.ObjectId, required: true, ref: 'Place' }] // This is temporary, it will be changed later
});

module.exports = mongoose.model('User', userSchema);