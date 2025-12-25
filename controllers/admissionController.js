const Student = require('../models/Student');

// @desc    Search for a student by USN
// @access  Private (Admission Dept)
const searchStudent = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).json({ message: 'Query parameter is required' });
        }

        const student = await Student.findOne({ usn: { $regex: query, $options: 'i' } })
            .populate('user', 'name email photoUrl');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        res.json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update College/Admission Fee Details
// @access  Private (Admission Dept)
const updateAdmissionDetails = async (req, res) => {
    try {
        const { collegeFeeDue, markSemPaid } = req.body;
        const student = await Student.findOne({ usn: req.params.usn });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (collegeFeeDue !== undefined) {
            const newDue = Number(collegeFeeDue);
            const difference = (student.collegeFeeDue || 0) - newDue;

            if (difference > 0) {
                // Payment made
                student.feeRecords.push({
                    year: student.currentYear,
                    semester: student.currentYear * 2, // Approximate
                    feeType: 'college',
                    amountDue: 0, // Not strictly tracking due here in simple mode
                    amountPaid: difference,
                    status: 'paid',
                    transactions: [{
                        amount: difference,
                        date: new Date(),
                        mode: 'Admission Dept', // Changed source
                        reference: 'Manual Adjustment'
                    }]
                });
            }
            student.collegeFeeDue = newDue;
        }

        // HANDLE SEMESTER-WISE PAYMENT
        if (markSemPaid) {
            const semesterToPay = Number(markSemPaid);
            // Find record by semester (unique 1-8) irrespective of current year to allow clearing backlogs
            const recordIndex = student.feeRecords.findIndex(r => r.semester === semesterToPay && r.feeType === 'college');

            if (recordIndex !== -1) {
                const record = student.feeRecords[recordIndex];
                const amountToPay = record.amountDue - (record.amountPaid || 0);

                if (amountToPay > 0) {
                    // Update Record
                    record.amountPaid = record.amountDue;
                    record.status = 'paid';

                    record.transactions.push({
                        amount: amountToPay,
                        date: new Date(),
                        mode: 'Admission Dept',
                        reference: `Semester ${semesterToPay} Payment`
                    });

                    // Update Top Level Due
                    student.collegeFeeDue = Math.max(0, (student.collegeFeeDue || 0) - amountToPay);

                    // Explicitly mark modified for Mongoose mixed types/arrays if needed
                    student.markModified('feeRecords');
                }
            } else {
                return res.status(404).json({ message: `Fee Record for Semester ${semesterToPay} not found` });
            }
        }

        const updatedStudent = await student.save();
        res.json(updatedStudent);

    } catch (error) {
        console.error("Admission Update Error:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

module.exports = { searchStudent, updateAdmissionDetails };
