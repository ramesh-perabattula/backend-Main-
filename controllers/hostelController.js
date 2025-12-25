const Student = require('../models/Student');

// @desc    Search for a student by USN
// @access  Private (Hostel Warden)
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

// @desc    Update Hostel Fee Details
// @access  Private (Hostel Warden)
const updateHostelDetails = async (req, res) => {
    try {
        const { hostelFeeDue, markSemPaid } = req.body;
        const student = await Student.findOne({ usn: req.params.usn });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (hostelFeeDue !== undefined) {
            const newDue = Number(hostelFeeDue);
            const difference = (student.hostelFeeDue || 0) - newDue;

            if (difference > 0) {
                student.feeRecords.push({
                    year: student.currentYear,
                    semester: student.currentYear * 2,
                    feeType: 'hostel',
                    amountDue: 0,
                    amountPaid: difference,
                    status: 'paid',
                    transactions: [{
                        amount: difference,
                        date: new Date(),
                        mode: 'Hostel Office',
                        reference: 'Manual Adjustment'
                    }]
                });
            }
            student.hostelFeeDue = newDue;
        }

        // HANDLE SEMESTER-WISE PAYMENT
        if (markSemPaid) {
            const semesterToPay = Number(markSemPaid);
            const recordIndex = student.feeRecords.findIndex(r => r.semester === semesterToPay && r.feeType === 'hostel');

            if (recordIndex !== -1) {
                const record = student.feeRecords[recordIndex];
                const amountToPay = record.amountDue - (record.amountPaid || 0);

                if (amountToPay > 0) {
                    record.amountPaid = record.amountDue;
                    record.status = 'paid';

                    record.transactions.push({
                        amount: amountToPay,
                        date: new Date(),
                        mode: 'Hostel Office',
                        reference: `Semester ${semesterToPay} Payment`
                    });

                    student.hostelFeeDue = Math.max(0, (student.hostelFeeDue || 0) - amountToPay);
                    student.markModified('feeRecords');
                }
            } else {
                return res.status(404).json({ message: `Fee Record for Semester ${semesterToPay} not found` });
            }
        }

        const updatedStudent = await student.save();
        res.json(updatedStudent);

    } catch (error) {
        console.error("Hostel Update Error:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

module.exports = { searchStudent, updateHostelDetails };
