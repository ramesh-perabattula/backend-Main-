const User = require('../models/User');
const Student = require('../models/Student');
const SystemConfig = require('../models/SystemConfig');

// @desc    Create a new student
// @route   POST /api/registrar/students
// @access  Private (Registrar)
const createStudent = async (req, res) => {
    try {
        const {
            username, password, name, department, currentYear,
            quota, entry, email,
            transportOpted, // Boolean
            transportRoute, // String - Added
            hostelOpted, // Boolean - Added for Hostel
            placementOpted, // Boolean - Added
            assignedCollegeFee, // For Management Quota
            assignedTransportFee, // If transportOpted is true
            assignedHostelFee, // If hostelOpted is true
            assignedPlacementFee // If placementOpted is true
        } = req.body;

        // 1. Create User
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const user = await User.create({
            username,
            password,
            name,
            email,
            role: 'student'
        });

        // 2. Determine fees
        let initialCollegeFee = 0;
        if (quota === 'management') {
            initialCollegeFee = assignedCollegeFee ? Number(assignedCollegeFee) : 0;
        } else {
            // GOV Quota is strictly 0 as per requirement
            initialCollegeFee = 0;
            // Note: If dynamic year fee logic exists, we should technically query that, 
            // but for now we fallback to global default or 0.
            // const config = await SystemConfig.findOne({ key: 'default_gov_fee' });
            // initialCollegeFee = config ? config.value : 0;
        }

        // Mutual Exclusivity Check (Hostel vs Transport)
        let finalTransportOpted = transportOpted;
        let finalHostelOpted = hostelOpted;

        if (finalTransportOpted && finalHostelOpted) {
            // If both are true, we need to pick one. Assuming Frontend handles this, but for safety:
            // prioritize Hostel if it's explicitly set to true
            finalTransportOpted = false;
        }

        let initialTransportFee = 0;
        if (finalTransportOpted) {
            initialTransportFee = assignedTransportFee ? Number(assignedTransportFee) : 0;
        }

        // 3. Create Student Profile
        const currentYearNum = parseInt(currentYear) || 1;
        const semA = (currentYearNum * 2) - 1;
        const semB = currentYearNum * 2;

        const feeRecords = [];

        // College Fee Split
        if (initialCollegeFee > 0) {
            const splitFee = Math.ceil(initialCollegeFee / 2);
            feeRecords.push({
                year: currentYearNum,
                semester: semA,
                feeType: 'college',
                amountDue: splitFee,
                status: 'pending',
                transactions: []
            });
            feeRecords.push({
                year: currentYearNum,
                semester: semB,
                feeType: 'college',
                amountDue: initialCollegeFee - splitFee, // Handle odd numbers
                status: 'pending',
                transactions: []
            });
        }

        // Transport Fee Split
        if (initialTransportFee > 0) {
            const splitTrans = Math.ceil(initialTransportFee / 2);
            feeRecords.push({
                year: currentYearNum,
                semester: semA,
                feeType: 'transport',
                amountDue: splitTrans,
                status: 'pending',
                transactions: []
            });
            feeRecords.push({
                year: currentYearNum,
                semester: semB,
                feeType: 'transport',
                amountDue: initialTransportFee - splitTrans,
                status: 'pending',
                transactions: []
            });
        }

        let initialHostelFee = 0;
        if (finalHostelOpted) {
            initialHostelFee = assignedHostelFee ? Number(assignedHostelFee) : 0;
        }

        // Hostel Fee Split
        if (initialHostelFee > 0) {
            const splitHostel = Math.ceil(initialHostelFee / 2);
            feeRecords.push({
                year: currentYearNum,
                semester: semA,
                feeType: 'hostel',
                amountDue: splitHostel,
                status: 'pending',
                transactions: []
            });
            feeRecords.push({
                year: currentYearNum,
                semester: semB,
                feeType: 'hostel',
                amountDue: initialHostelFee - splitHostel,
                status: 'pending',
                transactions: []
            });
        }

        let initialPlacementFee = 0;
        if (placementOpted) {
            initialPlacementFee = assignedPlacementFee ? Number(assignedPlacementFee) : 0;
            // Placement Fee usually one-time per year or purely one time. 
            // Splitting it per sem for consistency with other fees, or keep as one chunk?
            // Let's split it per sem for now to be consistent
            if (initialPlacementFee > 0) {
                const splitPlace = Math.ceil(initialPlacementFee / 2);
                feeRecords.push({
                    year: currentYearNum,
                    semester: semA,
                    feeType: 'placement',
                    amountDue: splitPlace,
                    status: 'pending',
                    transactions: []
                });
                feeRecords.push({
                    year: currentYearNum,
                    semester: semB,
                    feeType: 'placement',
                    amountDue: initialPlacementFee - splitPlace,
                    status: 'pending',
                    transactions: []
                });
            }
        }

        const student = await Student.create({
            user: user._id,
            usn: username,
            department,
            currentYear: currentYearNum,
            quota,
            entry,
            transportOpted: finalTransportOpted || false,
            transportRoute: finalTransportOpted ? transportRoute : '',
            hostelOpted: finalHostelOpted || false,
            placementOpted: placementOpted || false,
            collegeFeeDue: initialCollegeFee, // Keep total for high-level view
            transportFeeDue: initialTransportFee,
            hostelFeeDue: initialHostelFee,
            placementFeeDue: initialPlacementFee,

            // Persist Annual Fees
            annualCollegeFee: initialCollegeFee,
            annualTransportFee: initialTransportFee,
            annualHostelFee: initialHostelFee,
            annualPlacementFee: initialPlacementFee,

            feeRecords: feeRecords
        });

        res.status(201).json(student);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset User Password
// @route   POST /api/registrar/reset-password
// @access  Private (Registrar)
const resetPassword = async (req, res) => {
    try {
        const { username, newPassword } = req.body;

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.password = newPassword;
        // Note: The User model pre-save hook should handle hashing.
        // If the model checks isModified('password'), assigning it here triggers it.

        await user.save();

        res.json({ message: `Password reset successful for user ${username}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Student Details by USN
// @route   GET /api/registrar/students/:usn
// @access  Private (Registrar)
const getStudentByUSN = async (req, res) => {
    try {
        const student = await Student.findOne({ usn: req.params.usn })
            .populate('user', 'name email photoUrl role');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createStudent, resetPassword, getStudentByUSN };
