const mongoose = require('mongoose');

const studentSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    usn: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    currentYear: { type: Number, required: true, min: 1, max: 4 }, // "Years 1,2,3,4"
    quota: { type: String, enum: ['government', 'management'], required: true },
    entry: { type: String, enum: ['regular', 'lateral'], required: true },
    status: { type: String, enum: ['active', 'detained', 'dropout'], default: 'active' },

    // Fees Due Status
    transportOpted: { type: Boolean, default: false },
    transportRoute: { type: String, default: '' }, // Added Transport Route
    hostelOpted: { type: Boolean, default: false }, // Added Hostel Opted
    placementOpted: { type: Boolean, default: false }, // Added Placement Opted

    collegeFeeDue: { type: Number, default: 0 },
    transportFeeDue: { type: Number, default: 0 },
    hostelFeeDue: { type: Number, default: 0 }, // Added Hostel Fee Due
    placementFeeDue: { type: Number, default: 0 }, // Added Placement Fee Due
    lastSemDues: { type: Number, default: 0 },

    // Persistent Annual Fee Structure (Base Fee for subsequent years)
    annualCollegeFee: { type: Number, default: 0 },
    annualTransportFee: { type: Number, default: 0 },
    annualHostelFee: { type: Number, default: 0 },
    annualPlacementFee: { type: Number, default: 0 },

    // Professional Fee Management (Ledger)
    feeRecords: [{
        year: { type: Number, required: true },
        semester: { type: Number, required: true },
        feeType: { type: String, enum: ['college', 'transport', 'other', 'placement', 'hostel'], required: true }, // Added hostel
        amountDue: { type: Number, required: true },
        amountPaid: { type: Number, default: 0 },
        status: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
        transactions: [{
            amount: Number,
            date: { type: Date, default: Date.now },
            mode: String,
            reference: String
        }]
    }],

    // Eligibility Override
    eligibilityOverride: { type: Boolean, default: null }, // true=Force Eligible, false=Force Ineligible

    // Logic will primarily calculate this dynamically
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
