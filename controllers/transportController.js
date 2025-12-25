const Student = require('../models/Student');

// @desc    Search Student by USN
// @route   GET /api/transport/students/search
// @access  Private (Transport Dept)
const searchStudentForTransport = async (req, res) => {
    try {
        const { query } = req.query;
        const student = await Student.findOne({ usn: { $regex: query, $options: 'i' } })
            .populate('user', 'name email');

        if (student) {
            res.json(student);
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Transport Details
// @route   PUT /api/transport/students/:usn
// @access  Private (Transport Dept)
// @desc    Update Transport Details
// @route   PUT /api/transport/students/:usn
// @access  Private (Transport Dept)
const updateTransportDetails = async (req, res) => {
    try {
        const { transportOpted, transportFeeDue, markSemPaid, transportRoute } = req.body;
        const student = await Student.findOne({ usn: req.params.usn });

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (transportOpted !== undefined) student.transportOpted = transportOpted;
        if (transportRoute !== undefined) student.transportRoute = transportRoute;

        if (transportFeeDue !== undefined) {
            const newDue = Number(transportFeeDue);
            const oldDue = student.transportFeeDue || 0;
            student.transportFeeDue = newDue;

            // HANDLE POSITIVE FEE ASSIGNMENT (Split into Semesters)
            if (newDue > 0) {
                const currentYear = student.currentYear;
                const semA = (currentYear * 2) - 1;
                const semB = currentYear * 2;
                const splitFee = Math.ceil(newDue / 2); // Split evenly

                const updateOrAddRecord = (semester, dueAmount) => {
                    const existing = student.feeRecords.find(r => r.year === currentYear && r.semester === semester && r.feeType === 'transport');
                    if (existing) {
                        existing.amountDue = dueAmount;
                        // Update status logic
                        if (existing.amountPaid >= dueAmount) existing.status = 'paid';
                        else if (existing.amountPaid > 0) existing.status = 'partial';
                        else existing.status = 'pending';
                    } else {
                        student.feeRecords.push({
                            year: currentYear,
                            semester: semester,
                            feeType: 'transport',
                            amountDue: dueAmount,
                            status: 'pending',
                            transactions: []
                        });
                    }
                };

                updateOrAddRecord(semA, splitFee);
                updateOrAddRecord(semB, newDue - splitFee);
            }

            // Sync with Ledger if marking as PAID (0)
            // Sync with Ledger if marking as PAID (0)
            if (newDue === 0 && student.feeRecords) {
                // Find ALL active transport records and clear them
                student.feeRecords.forEach(r => {
                    if (r.feeType === 'transport' && r.status !== 'paid') {
                        const paidNow = r.amountDue - (r.amountPaid || 0);
                        r.amountPaid = r.amountDue; // Mark fully paid
                        r.status = 'paid';

                        if (paidNow > 0) {
                            r.transactions.push({
                                amount: paidNow,
                                date: new Date(),
                                mode: 'Transport Dept',
                                reference: 'Marked as Paid by Transport Dept'
                            });
                        }
                    }
                });
            }
        }

        // HANDLE SEMESTER-WISE PAYMENT
        if (markSemPaid) {
            const semesterToPay = Number(markSemPaid);
            // Find record by semester (unique 1-8) irrespective of current year to allow clearing backlogs
            const recordIndex = student.feeRecords.findIndex(r => r.semester === semesterToPay && r.feeType === 'transport');

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
                        mode: 'Transport Dept',
                        reference: `Semester ${semesterToPay} Payment`
                    });

                    // Update Top Level Due
                    student.transportFeeDue = Math.max(0, (student.transportFeeDue || 0) - amountToPay);

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
        console.error("Transport Update Error:", error);
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

module.exports = { searchStudentForTransport, updateTransportDetails };
