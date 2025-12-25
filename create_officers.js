const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const createOfficers = async () => {
    try {
        const officers = [
            {
                username: 'admission_officer',
                password: 'password123',
                role: 'admission_officer',
                name: 'Admission Officer',
                email: 'admission@bvce.edu'
            },
            {
                username: 'placement_officer',
                password: 'password123',
                role: 'placement_officer',
                name: 'Placement Officer',
                email: 'placement@bvce.edu'
            },
            {
                username: 'hostel_manager', // Changed from hostel_warden
                password: 'password123',
                role: 'hostel_manager',     // Changed from hostel_warden
                name: 'Hostel Manager',
                email: 'hostel@bvce.edu'
            }
        ];

        for (const officer of officers) {
            const userExists = await User.findOne({ username: officer.username });

            if (userExists) {
                console.log(`User ${officer.username} already exists. Updating credentials...`);
                userExists.role = officer.role;
                userExists.password = officer.password; // Force password update
                await userExists.save(); // Triggers pre-save hook to hash password
                console.log(`Updated role and password for ${officer.username}`);
            } else {
                await User.create(officer);
                console.log(`Created user: ${officer.username}`);
            }
        }

        console.log('Officers Updated/Created Successfully');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

createOfficers();
