const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rxvwb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const userCollection = client.db("LesonPaw-user").collection("users");
    const tutorCollection = client.db("LesonPaw-user").collection("tutors");
    const jobCollection = client.db("LesonPaw-user").collection("jobs");
    const messageCollection = client.db("LesonPaw-user").collection("messages");
    const notificationCollection = client.db("LesonPaw-user").collection("notifications");
    const subjectCollection = client.db("LesonPaw-user").collection("subjects");
    const locationCollection = client.db("LesonPaw-user").collection("locations");
    const paymentCollection = client.db("LesonPaw-user").collection("payments");
    const ratingCollection = client.db("LesonPaw-user").collection("ratings");
    const serviceCollection = client.db("LesonPaw-user").collection("services");
    const cartsCollection = client.db("LesonPaw-user").collection("carts");
    const studentCollection = client.db("LesonPaw-user").collection("students");
    const teacherApplicationsCollection = client.db("LesonPaw-user").collection("teacherApplications");
    const storyCollection = client.db("LesonPaw-user").collection("stories");
    // JWT related API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
      res.send({ token });
    });

    // Middleware for token verification
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
      });
    };

    // Middleware for admin verification
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };


    // Get user job post count
    app.get('/user/job-post-count', verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res.status(404).send({ message: 'User not found' });
      }
      res.send({ jobPostCount: user.jobPostCount || 0 });
    });


    /// Example: routes/userRoutes.js or similar
app.get('/users/profile/:email', async (req, res) => {
  const email = req.params.email;

  // Find the user in your DB (MongoDB assumed)
  const user = await userCollection.findOne({ email }); // adjust based on your DB logic

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.json(user);
});

app.post('/jobs', verifyToken, async (req, res) => {
  const job = req.body;
  if (!job.subject || !job.topicsGoals || !job.gradeLevel || !job.sessionsPerWeek || !job.openToNegotiation || !job.email) {
    return res.status(400).send({ message: 'Missing required fields' });
  }

  try {
    const user = await userCollection.findOne({ email: job.email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const jobPostCount = user.jobPostCount || 0;
    if (jobPostCount >= 3) {
      const paymentExists = await paymentCollection.findOne({
        studentEmail: job.email,
        paymentType: 'job-post-fee',
        status: 'completed',
      });
      if (!paymentExists) {
        return res.status(402).send({ message: 'Payment required: $10 job posting fee after 3 posts' });
      }
    }

    const jobData = {
      email: job.email,
      subject: job.subject,
      topicsGoals: job.topicsGoals,
      gradeLevel: job.gradeLevel,
      modeOfLearning: job.modeOfLearning || 'Not specified',
      location: job.location || 'Not specified',
      availability: job.availability || 'Not specified',
      sessionsPerWeek: job.sessionsPerWeek,
      budget: job.budget || 'Not specified',
      openToNegotiation: job.openToNegotiation,
      startDate: job.startDate || null,
      deadline: job.deadline || null,
      helpType: job.helpType || [],
      additionalNotes: job.additionalNotes || 'None',
      postedAt: new Date(),
      status: 'pending',
    };

    const result = await jobCollection.insertOne(jobData);

    await userCollection.updateOne(
      { email: job.email },
      { $set: { jobPostCount: jobPostCount + 1 } }
    );

    res.status(201).send(result);
  } catch (error) {
    console.error('Error posting job:', error);
    res.status(500).send({ message: 'Failed to post job' });
  }
});

// Get all jobs
    app.get('/jobs', async (req, res) => {
      try {
        const result = await jobCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).send({ message: 'Failed to fetch jobs' });
      }
    });
// Fetch user's jobs
app.get('/jobs', verifyToken, async (req, res) => {
  const email = req.decoded.email;
  const result = await jobCollection.find({ email }).toArray();
  res.send(result);
});

// Fetch available jobs
app.get('/jobs/available', verifyToken, async (req, res) => {
  const result = await jobCollection.find({ status: 'pending' }).toArray();
  res.send(result);
});

// Apply to a job
// app.post('/jobs/apply/:id', verifyToken, async (req, res) => {
//   const jobId = req.params.id;
//   const name = req.decoded.name;
//   const job = await jobCollection.findOne({ _id: new ObjectId(jobId) });
//   if (!job) {
//     return res.status(404).send({ message: 'Job not found' });
//   }
//   await jobCollection.updateOne(
//     { _id: new ObjectId(jobId) },
//     { $push: { applicants: name } }
//   );
//   await notificationCollection.insertOne({
//     recipientEmail: job.email,
//     message: `Tutor ${tutorEmail} applied to your job "${job.subject} which is created on ${job.postedAt
// }"`,
//     createdAt: new Date(),
//     status: 'unread',
//   });
//   res.send({ message: 'Application submitted' });
// });
// Apply to a job

// app.post('/jobs/apply/:id', verifyToken, async (req, res) => {
//   const jobId = req.params.id;
//   const name = req.decoded.name; // Tutor's name from JWT
//   const job = await jobCollection.findOne({ _id: new ObjectId(jobId) });
//   if (!job) {
//     return res.status(404).send({ message: 'Job not found' });
//   }

//   // Check if tutor has already applied
//   if (job.applicants && job.applicants.includes(name)) {
//     return res.status(400).send({ message: 'You have already applied to this job' });
//   }

//   await jobCollection.updateOne(
//     { _id: new ObjectId(jobId) },
//     { $push: { applicants: name } }
//   );
//   await notificationCollection.insertOne({
//     recipientEmail: job.email,
//     message: `Tutor ${name} applied to your job "${job.subject}" created on ${new Date(job.postedAt).toLocaleDateString()}`,
//     createdAt: new Date(),
//     status: 'unread',
//   });
//   res.send({ message: 'Application submitted' });
// });
// Apply to a job
app.post('/jobs/apply/:id', verifyToken, async (req, res) => {
  const jobId = req.params.id;
  const email = req.decoded.email; // Tutor's email from JWT

  // Fetch tutor from tutorCollection to get the name
  const tutor = await tutorCollection.findOne({ email });
  if (!tutor) {
    return res.status(404).send({ message: 'Tutor not found' });
  }
  const tutorName = tutor.name; // Get tutor's name

  const job = await jobCollection.findOne({ _id: new ObjectId(jobId) });
  if (!job) {
    return res.status(404).send({ message: 'Job not found' });
  }

  // Initialize applicants array if undefined
  if (!job.applicants) {
    await jobCollection.updateOne(
      { _id: new ObjectId(jobId) },
      { $set: { applicants: [] } }
    );
    job.applicants = [];
  }

  // Check if tutor has already applied (handle null/undefined entries)
  if (job.applicants.some(applicant => applicant && (typeof applicant === 'string' ? applicant === email : applicant.email === email))) {
    return res.status(400).send({ message: 'You have already applied to this job' });
  }

  // Add tutor's email and name to applicants array
  await jobCollection.updateOne(
    { _id: new ObjectId(jobId) },
    { $push: { applicants: { email, name: tutorName } } }
  );

  // Create notification with tutor's name
  await notificationCollection.insertOne({
    recipientEmail: job.email,
    message: `Tutor ${tutorName} applied to your job "${job.subject}" created on ${new Date(job.postedAt).toLocaleDateString()}`,
    createdAt: new Date(),
    status: 'unread',
  });

  res.send({ message: 'Application submitted' });
});
// Send a message
// show message
// New endpoint: Get all messages (public access, no authentication required)
    app.get('/messages', async (req, res) => {
      try {
        const result = await messageCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).send({ message: 'Failed to fetch messages' });
      }
    });
    // send message
app.post('/send-message', verifyToken, async (req, res) => {
  const { message, email } = req.body;
  if (!message || !email) {
    return res.status(400).send({ message: 'Message and email are required' });
  }

  try {
    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    const messageData = {
      senderEmail: email,
      message,
      sentAt: new Date(),
      status: 'unread',
    };

    const result = await messageCollection.insertOne(messageData);
    res.status(201).send({ message: 'Message sent', result });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send({ message: 'Failed to send message' });
  }
});
    app.get('/available-tutors', async (req, res) => {
      const result = await tutorCollection.find({ status: 'active' }).toArray();
      res.send(result);
    });

    app.post('/tutors', verifyToken, verifyAdmin, async (req, res) => {
      const tutor = req.body;
      const existingTutor = await tutorCollection.findOne({ email: tutor.email });
      if (existingTutor) {
        return res.status(400).send({ message: 'Tutor with this email already exists' });
      }
      const result = await tutorCollection.insertOne(tutor);
      res.send(result);
    });

    app.get('/tutors', async (req, res) => {
      const result = await tutorCollection.find().toArray();
      res.send(result);
    });
// Get a single tutor by ID
app.get('/tutors/:tutorId', async (req, res) => {
  const tutorId = req.params.tutorId;
  
  try {
    const tutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });
    
    if (!tutor) {
      return res.status(404).send({ message: 'Tutor not found' });
    }
    res.send(tutor);
  } catch (error) {
    console.error('Error fetching tutor:', error);
    res.status(500).send({ message: 'Failed to fetch tutor' });
  }
});
app.get('/tutors/:email', async (req, res) => {
  const email = req.params.email;
  const result = await tutorCollection.findOne({ email });
  if (!result) {
    return res.status(404).send({ message: 'Tutor not found' });
  }
  res.send(result);
});

//  app.get('/tutors/:email', async (req, res) => {
//   try {
//     const email = req.params.email;
//     const result = await tutorCollection.findOne({ email });

//     if (!result) {
//       return res.status(404).json({ message: 'Tutor not found' });
//     }

//     res.send(result);
//   } catch (error) {
//     console.error('Error fetching tutor:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// });
   
     // New route: Update a tutor
    app.put('/tutors/:tutorId', verifyToken, verifyAdmin, async (req, res) => {
      const tutorId = req.params.tutorId;
      const tutorData = req.body;

      // Validate required fields
      if (!tutorData.name || !tutorData.email) {
        return res.status(400).send({ message: 'Name and email are required' });
      }

      try {
        const existingTutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });
        if (!existingTutor) {
          return res.status(404).send({ message: 'Tutor not found' });
        }

        // Check if email is being changed and if new email is already in use
        if (tutorData.email !== existingTutor.email) {
          const emailInUse = await tutorCollection.findOne({ email: tutorData.email });
          if (emailInUse) {
            return res.status(400).send({ message: 'Email already in use by another tutor' });
          }
        }

        const updateData = {
          name: tutorData.name,
          email: tutorData.email,
          subjects: tutorData.subjects || existingTutor.subjects || [],
          educationalQualifications: tutorData.educationalQualifications || existingTutor.educationalQualifications || '',
          experience: parseInt(tutorData.experience) || existingTutor.experience || 0,
          hourlyRate: parseFloat(tutorData.hourlyRate) || existingTutor.hourlyRate || 0,
          teachingMode: tutorData.teachingMode || existingTutor.teachingMode || '',
          availability: tutorData.availability || existingTutor.availability || [],
          bio: tutorData.bio || existingTutor.bio || '',
          photoURL: tutorData.photoURL || existingTutor.photoURL || '',
          status: tutorData.status || existingTutor.status || 'active',
          dateOfBirth: tutorData.dateOfBirth || existingTutor.dateOfBirth || '',
          gender: tutorData.gender || existingTutor.gender || '',
          contactNumber: tutorData.contactNumber || existingTutor.contactNumber || '',
          certifications: tutorData.certifications || existingTutor.certifications || [],
          institution: tutorData.institution || existingTutor.institution || '',
          address: tutorData.address || existingTutor.address || {},
          updatedAt: new Date(),
        };

        const result = await tutorCollection.updateOne(
          { _id: new ObjectId(tutorId) },
          { $set: updateData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Tutor not found' });
        }

        // Update related services if email changed
        if (tutorData.email !== existingTutor.email) {
          await serviceCollection.updateMany(
            { tutorEmail: existingTutor.email },
            { $set: { tutorEmail: tutorData.email, tutorName: tutorData.name } }
          );
          await cartsCollection.updateMany(
            { tutorEmail: existingTutor.email },
            { $set: { tutorEmail: tutorData.email, tutorName: tutorData.name } }
          );
        }

        res.send({ message: 'Tutor updated successfully', modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error('Error updating tutor:', error);
        res.status(500).send({ message: 'Failed to update tutor' });
      }
    });

    // New route: Delete a tutor
    app.delete('/tutors/:tutorId', verifyToken, verifyAdmin, async (req, res) => {
      const tutorId = req.params.tutorId;

      try {
        const existingTutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });
        if (!existingTutor) {
          return res.status(404).send({ message: 'Tutor not found' });
        }

        // Delete the tutor
        const result = await tutorCollection.deleteOne({ _id: new ObjectId(tutorId) });

        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Tutor not found' });
        }

        // Cascade deletion: Remove related services and cart items
        await serviceCollection.deleteMany({ tutorEmail: existingTutor.email });
        await cartsCollection.deleteMany({ tutorEmail: existingTutor.email });

        // Optional: Add audit log for deletion
        await client.db("LesonPaw-user").collection("auditLogs").insertOne({
          action: 'delete_tutor',
          tutorId,
          tutorEmail: existingTutor.email,
          adminEmail: req.decoded.email,
          timestamp: new Date(),
        });

        res.send({ message: 'Tutor deleted successfully', deletedCount: result.deletedCount });
      } catch (error) {
        console.error('Error deleting tutor:', error);
        res.status(500).send({ message: 'Failed to delete tutor' });
      }
    });
// service
// Post a service
    app.post('/services', verifyToken, async (req, res) => {
      const service = req.body;
      const serviceData = {
        tutorEmail: service.tutorEmail,
        tutorName: service.tutorName,
        subject: service.subject || "",
        teachingMode: service.teachingMode || "Online",
        hourlyRate: parseFloat(service.hourlyRate) || 0,
        availability: service.availability || "",
        location: service.teachingMode === "Online" ? null : (service.location || ""),
        secondaryLocation: service.secondaryLocation || "",
        description: service.description || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "active",
      };

      console.log("Received service data:", serviceData);

      try {
        const result = await serviceCollection.insertOne(serviceData);
        res.status(201).send({ insertedId: result.insertedId });
      } catch (error) {
        console.error("Error adding service:", error);
        res.status(500).send({ message: "Failed to create service" });
      }
    });


    // Fetch all active services
    app.get('/services/all', verifyToken, async (req, res) => {
      try {
        const query = { status: 'active' };
        const result = await serviceCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).send({ message: "Failed to fetch services" });
      }
    });
    // Update a service
    app.put('/services/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const service = req.body;
      try {
        const existingService = await serviceCollection.findOne({ _id: new ObjectId(id) });
        if (!existingService || existingService.tutorEmail !== req.decoded.email) {
          return res.status(403).send({ message: 'Unauthorized to update this service' });
        }

        const updateData = {
          tutorEmail: service.tutorEmail,
          tutorName: service.tutorName,
          subject: service.subject || "",
          teachingMode: service.teachingMode || "Online",
          hourlyRate: parseFloat(service.hourlyRate) || 0,
          availability: service.availability || "",
          location: service.teachingMode === "Online" ? null : (service.location || ""),
          secondaryLocation: service.secondaryLocation || "",
          description: service.description || "",
          updatedAt: new Date().toISOString(),
          status: "active",
        };

        const result = await serviceCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating service:", error);
        res.status(500).send({ message: "Failed to update service" });
      }
    });
    // Delete a service
   // Delete a service
    // Delete a service
// Delete a service (validation removed)
app.delete('/services/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  try {
    const result = await serviceCollection.deleteOne({ _id: new ObjectId(id) });
    res.send({ message: 'Service deleted successfully', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).send({ message: 'Failed to delete service', error: error.message });
  }
});

app.get('/services/all', verifyToken, async (req, res) => {
      try {
        const query = { status: 'active' };
        const result = await serviceCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching services:", error);
        res.status(500).send({ message: "Failed to fetch services" });
      }
    });

    // Delete a service
    // app.delete('/services/:id', verifyToken, async (req, res) => {
    //   const id = req.params.id;
    //   try {
    //     const existingService = await serviceCollection.findOne({ _id: new ObjectId(id) });
    //     if (!existingService) {
    //       return res.status(404).send({ message: 'Service not found' });
    //     }
    //     if (existingService.tutorEmail !== req.decoded.email) {
    //       return res.status(403).send({ message: 'Unauthorized to delete this service' });
    //     }
    //     const result = await serviceCollection.deleteOne({ _id: new ObjectId(id) });
    //     res.send({ message: 'Service deleted successfully', deletedCount: result.deletedCount });
    //   } catch (error) {
    //     console.error("Error deleting service:", error);
    //     res.status(500).send({ message: "Failed to delete service" });
    //   }
    // });

    
    app.get('/notifications', verifyToken, async (req, res) => {
      const email = req.decoded.email;
      const result = await notificationCollection.find({ recipientEmail: email }).toArray();
      res.send(result);
    });

    app.post('/notifications', verifyToken, async (req, res) => {
      const { recipientEmail, message } = req.body;
      const notification = {
        recipientEmail,
        message,
        createdAt: new Date(),
        status: 'unread',
      };
      const result = await notificationCollection.insertOne(notification);
      res.send(result);
    });


// Add new subject to tutor
app.post('/subjects', verifyToken, async (req, res) => {
  const { name, tutorId } = req.body;

  // Log the request body for debugging
  console.log("Received data:", req.body);

  // Check for required fields
  if (!name || !tutorId) {
    return res.status(400).send({ message: 'Subject name and tutor ID are required' });
  }

  // Find the tutor by ID
  const tutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });
  if (!tutor) {
    return res.status(404).send({ message: 'Tutor not found' });
  }

  // Check if the subject already exists for this tutor
  const alreadyExists = tutor.subjects.includes(name);
  if (alreadyExists) {
    return res.status(409).send({ message: 'Subject already exists for this tutor' });
  }

  // Update tutor's subjects array with the new subject
  const result = await tutorCollection.updateOne(
    { _id: new ObjectId(tutorId) },
    { $addToSet: { subjects: name } }
  );

  if (result.modifiedCount > 0) {
    res.send({ modifiedCount: result.modifiedCount, message: 'Subject added to tutor' });
  } else {
    res.status(500).send({ message: 'Failed to add subject' });
  }
});



app.get('/subjects', verifyToken, async (req, res) => {
  const tutorsWithSubjects = await tutorCollection
    .find({ subjects: { $exists: true, $ne: [] } })
    .project({ name: 1, subjects: 1 })
    .toArray();
  res.send(tutorsWithSubjects);
});

app.delete('/subjects/:tutorId/:subjectsName', verifyToken, async (req, res) => {
  const { tutorId, subjectsName } = req.params;

  const result = await tutorCollection.updateOne(
    { _id: new ObjectId(tutorId) },
    { $pull: { subjects: subjectsName } } // Fix: remove from 'subjects', not 'locations'
  );

  if (result.modifiedCount > 0) {
    res.send({ message: 'Subject removed from tutor', modifiedCount: result.modifiedCount });
  } else {
    res.status(404).send({ message: 'Subject not found or not assigned to tutor' });
  }
  
});


    // Add location
app.post('/locations', verifyToken, async (req, res) => {
  const { name, tutorId } = req.body;

  if (!name || !tutorId) {
    return res.status(400).send({ message: 'Location name and tutor ID are required' });
  }

  const tutor = await tutorCollection.findOne({ _id: new ObjectId(tutorId) });
  if (!tutor) {
    return res.status(404).send({ message: 'Tutor not found' });
  }

  const alreadyExists = tutor.locations?.includes(name);
  if (alreadyExists) {
    return res.status(409).send({ message: 'Location already exists for this tutor' });
  }

  const result = await tutorCollection.updateOne(
    { _id: new ObjectId(tutorId) },
    { $addToSet: { locations: name } } // ensures no duplicates
  );

  res.send({ modifiedCount: result.modifiedCount, message: 'Location added to tutor' });
});
app.get('/locations', verifyToken, async (req, res) => {
  const tutorsWithLocations = await tutorCollection
    .find({ locations: { $exists: true, $ne: [] } })
    .project({ name: 1, locations: 1 })
    .toArray();
  res.send(tutorsWithLocations);
});
app.delete('/locations/:tutorId/:locationName', verifyToken, async (req, res) => {
  const { tutorId, locationName } = req.params;

  const result = await tutorCollection.updateOne(
    { _id: new ObjectId(tutorId) },
    { $pull: { locations: locationName } }
  );

  if (result.modifiedCount > 0) {
    res.send({ message: 'Location removed from tutor', modifiedCount: result.modifiedCount });
  } else {
    res.status(404).send({ message: 'Location not found or not assigned to tutor' });
  }
});




 
    
    app.get('/carts', verifyToken, async (req, res) => {
  const email = req.query.email;
  if (req.decoded.email !== email) {
    return res.status(403).send({ message: 'Forbidden access' });
  }
  const query = { email: email };
  const result = await cartsCollection.find(query).toArray();
  res.send(result);
});

app.delete('/carts/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id), email: req.decoded.email };
  const result = await cartsCollection.deleteOne(query);
  if (result.deletedCount === 0) {
    return res.status(404).send({ message: 'Cart item not found or unauthorized' });
  }
  res.send(result);
});

app.post('/carts', verifyToken, async (req, res) => {
  const cartItem = req.body;
  if (!cartItem.tutorId || !cartItem.email || cartItem.email !== req.decoded.email) {
    return res.status(400).send({ message: 'Invalid cart item data' });
  }
  const tutor = await tutorCollection.findOne({ _id: new ObjectId(cartItem.tutorId) });
  if (!tutor) {
    return res.status(404).send({ message: 'Tutor not found' });
  }
  
  const cartData = {
  email: cartItem.email,
  tutorId: cartItem.tutorId,
  tutorName: tutor.name,
  tutorEmail: tutor.email,
  subject: cartItem.subject || (Array.isArray(tutor.subjects) ? tutor.subjects[0] : 'Not specified'),
  location: tutor.location || 'Not specified',
  price: tutor.price || tutor.hourlyRate || 0,
  createdAt: new Date(),
};

  const result = await cartsCollection.insertOne(cartData);
  res.send(result);
});

   

   

    // app.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
    //   const totalUsers = await userCollection.countDocuments();
    //   const totalTutors = await tutorCollection.countDocuments();
    //   const totalJobs = await jobCollection.countDocuments();
    //   const total = await paymentCollection.countDocuments();
    //    const totalStudent = await studentCollection.countDocuments();

    //   res.send({
    //     totalUsers,
    //     totalTutors,
    //     totalJobs,
       
    //     totalPayments,
    //     totalStudent,
    //   });
    // });
// app.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
//   const { period = 'monthly' } = req.query;
//   const match = {};

//   if (period === 'daily') {
//     match.createdAt = { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) };
//   } else if (period === 'weekly') {
//     match.createdAt = { $gte: new Date(new Date().setDate(new Date().getDate() - 7)) };
//   } else if (period === 'monthly') {
//     match.createdAt = { $gte: new Date(new Date().setMonth(new Date().getMonth() - 1)) };
//   }

//   const totalUsers = await userCollection.countDocuments(match);
//   const totalTutors = await tutorCollection.countDocuments(match);
//   const totalJobs = await jobCollection.countDocuments(match);
//   const totalPayments = await paymentCollection.countDocuments(match);
//   const totalStudent = await studentCollection.countDocuments(match);

//   res.send({
//     totalUsers,
//     totalTutors,
//     totalJobs,
//     totalPayments,
//     totalStudent,
//   });
// });

app.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
  const totalUsers = await userCollection.countDocuments();
  const totalTutors = await tutorCollection.countDocuments();
  const totalJobs = await jobCollection.countDocuments();
  const totalPayments = await paymentCollection.countDocuments();
  const totalStudent = await studentCollection.countDocuments();

  res.send({
    totalUsers,
    totalTutors,
    totalJobs,
    totalPayments,
    totalStudent,
  });
});
  
   app.post('/ratings', verifyToken, async (req, res) => {
  const { tutorId, studentEmail, rating, comment } = req.body;

  if (!tutorId || !studentEmail || !rating || !comment) {
    return res.status(400).send({ message: 'Missing required fields' });
  }

  const review = {
    studentEmail,
    rating,
    comment,
    createdAt: new Date(),
  };

  try {
    const result = await tutorCollection.updateOne(
      { _id: new ObjectId(tutorId) },
      { $push: { reviews: review } }
    );

    if (result.modifiedCount > 0) {
      res.send({ success: true, message: 'Review added to tutor' });
    } else {
      res.status(404).send({ message: 'Tutor not found' });
    }
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


    app.get('/ratings/:tutorId', async (req, res) => {
  const tutorId = req.params.tutorId;

  try {
    const tutor = await tutorCollection.findOne(
      { _id: new ObjectId(tutorId) },
      { projection: { reviews: 1 } }
    );

    if (!tutor) {
      return res.status(404).send({ message: 'Tutor not found' });
    }

    res.send(tutor.reviews || []);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).send({ message: 'Server error' });
  }
});


 

    // User management APIs
    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      const admin = user?.role === 'admin';
      res.send({ admin });
    });

    app.get('/users/teacher/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const user = await userCollection.findOne(query);
      const teacher = user?.role === 'teacher';
      res.send({ teacher });
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.send({ message: 'User already exists', insertedId: null });
      }
      const result = await userCollection.insertOne({ ...user, jobPostCount: 0 });
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: { role: 'admin' } };
      const result = await userCollection.updateOne(filter, update);
      res.send(result);
    });

    app.patch('/users/teacher/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const update = { $set: { role: 'teacher' } };
      const result = await userCollection.updateOne(filter, update);
      res.send(result);
    });

   
    // Submit a teacher application
    app.patch('/users/request-teacher/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const { title, reason, cvLink } = req.body;

      // Verify the user is submitting for their own account
      if (req.decoded.email !== email) {
        return res.status(403).send({ message: "Forbidden: You can only submit a request for your own account" });
      }

      // Validate required fields
      if (!title || !reason || !cvLink) {
        return res.status(400).send({ message: "Title, reason, and CV link are required" });
      }

      try {
        // Check if user exists
        const user = await userCollection.findOne({ email });
        if (!user) {
          return res.status(404).send({ success: false, message: "User not found." });
        }

        // Check if application already exists
        const existingApplication = await teacherApplicationsCollection.findOne({ email });
        if (existingApplication) {
          return res.status(409).send({ success: false, message: "Teacher application already submitted." });
        }

        // Update user status to 'requested'
        const userUpdate = { $set: { status: "requested" } };
        await userCollection.updateOne({ email }, userUpdate);

        // Save teacher application data
        const applicationData = {
          email,
          title,
          reason,
          cvLink,
          submittedAt: new Date(),
          status: "pending", // Application status (e.g., pending, approved, rejected)
        };
        const result = await teacherApplicationsCollection.insertOne(applicationData);

        res.status(200).send({
          success: true,
          message: "Teacher application submitted successfully.",
          result,
        });
      } catch (error) {
        console.error("Error submitting teacher application:", error);
        res.status(500).send({ success: false, message: "Internal server error." });
      }
    });

    // Fetch teacher applications for admin
    app.get('/teacher-requests', verifyToken, verifyAdmin, async (req, res) => {
      try {
        const result = await teacherApplicationsCollection.find({ status: "pending" }).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching teacher requests:", error);
        res.status(500).send({ message: "Internal server error." });
      }
    });
// add for show all the application
app.get('/teacher-requests', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const result = await teacherApplicationsCollection.find({ status: "pending" }).toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching teacher requests:", error);
    res.status(500).send({ message: "Internal server error." });
  }
});
    app.patch('/users/reject-teacher/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const update = { $set: { status: 'rejected' } };
      const result = await userCollection.updateOne(filter, update);
      res.send(result);
    });

    app.put('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const update = req.body;
      const result = await userCollection.updateOne({ email }, { $set: update });
      res.send(result);
    });
    // payment
// app.post('/create-payment-intent', async (req, res) => {
//   const { price } = req.body;
//   const amount = parseInt(price * 100);
  

//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: amount,
//     currency: 'usd',
//     payment_method_types: ['card']
//   });

//   res.send({
//     clientSecret: paymentIntent.client_secret
//   })
// });
app.post('/create-payment-intent', async (req, res) => {
    try {
        const { price } = req.body;
        console.log("Received price:", price);
        const amount = Math.round(price * 100);
        console.log("Amount in cents:", amount);

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            payment_method_types: ['card']
        });

        console.log("Payment Intent created:", paymentIntent);
        res.send({
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).send({ error: error.message });
    }
});


app.post('/payments', async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment);

  
  const query = {
    _id: {
      $in: payment.cartIds.map(id => new ObjectId(id))
    }
  };

  const deleteResult = await cartsCollection.deleteMany(query);

  res.send({ paymentResult, deleteResult });
})



app.get('/payments/:email', verifyToken, async (req, res) => {
  const query = { email: req.params.email }
  if (req.params.email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
})





// Student Collection Endpoints
    app.get('/students/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (req.decoded.email !== email) {
          return res.status(403).send({ message: 'Forbidden: You can only access your own profile' });
        }
        const student = await studentCollection.findOne({ email });
        if (!student) {
          return res.status(404).send({ message: 'Student profile not found' });
        }
        res.send(student);
      } catch (error) {
        console.error('Error fetching student profile:', error);
        res.status(500).send({ message: 'Server error while fetching profile' });
      }
    });

    app.put('/students/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (req.decoded.email !== email) {
          return res.status(403).send({ message: 'Forbidden: You can only update your own profile' });
        }
        const updatedProfile = req.body;

        // Validate required fields
        if (
          !updatedProfile.fullName ||
          !updatedProfile.dateOfBirth ||
          !updatedProfile.gender ||
          !updatedProfile.contactNumber ||
          !updatedProfile.institution ||
          !updatedProfile.studentId ||
          !updatedProfile.gradeYearOfStudy ||
          !updatedProfile.permanentAddress ||
          !updatedProfile.currentAddress ||
          !updatedProfile.cityStateCountry ||
          !updatedProfile.zipPostalCode ||
          !updatedProfile.guardianName ||
          !updatedProfile.guardianContactNumber
        ) {
          return res.status(400).send({ message: 'All required fields must be provided' });
        }
        if (!/^[0-9+\-\s]{10,15}$/.test(updatedProfile.contactNumber) || !/^[0-9+\-\s]{10,15}$/.test(updatedProfile.guardianContactNumber)) {
          return res.status(400).send({ message: 'Invalid contact number format' });
        }

        // Check for unique studentId (excluding the current student)
        const existingStudent = await studentCollection.findOne({
          studentId: updatedProfile.studentId,
          email: { $ne: email },
        });
        if (existingStudent) {
          return res.status(400).send({ message: 'Student ID already in use' });
        }

        const updateDoc = {
          $set: {
            email: email,
            fullName: updatedProfile.fullName,
            photoURL: updatedProfile.photoURL || '',
            dateOfBirth: updatedProfile.dateOfBirth,
            gender: updatedProfile.gender,
            contactNumber: updatedProfile.contactNumber,
            institution: updatedProfile.institution,
            studentId: updatedProfile.studentId,
            gradeYearOfStudy: updatedProfile.gradeYearOfStudy,
            permanentAddress: updatedProfile.permanentAddress,
            currentAddress: updatedProfile.currentAddress,
            cityStateCountry: updatedProfile.cityStateCountry,
            zipPostalCode: updatedProfile.zipPostalCode,
            guardianName: updatedProfile.guardianName,
            guardianContactNumber: updatedProfile.guardianContactNumber,
            guardianEmail: updatedProfile.guardianEmail || '',
            updatedAt: new Date(),
          },
        };

        const result = await studentCollection.updateOne(
          { email },
          updateDoc,
          { upsert: true }
        );

        if (result.matchedCount === 0 && result.upsertedCount === 0) {
          return res.status(404).send({ message: 'Student profile not found' });
        }

        res.send({
          ...updateDoc.$set,
          createdAt: result.upsertedId ? new Date() : (await studentCollection.findOne({ email })).createdAt,
        });
      } catch (error) {
        console.error('Error updating student profile:', error);
        res.status(500).send({ message: 'Server error while updating profile' });
      }
    });

    app.delete('/students/:email', verifyToken, async (req, res) => {
      try {
        const email = req.params.email;
        if (req.decoded.email !== email) {
          return res.status(403).send({ message: 'Forbidden: You can only delete your own profile' });
        }
        const result = await studentCollection.deleteOne({ email });
        if (result.deletedCount === 0) {
          return res.status(404).send({ message: 'Student profile not found' });
        }
        res.send({ message: 'Student profile deleted successfully' });
      } catch (error) {
        console.error('Error deleting student profile:', error);
        res.status(500).send({ message: 'Server error while deleting profile' });
      }
    });
    // new
    app.get('/students',  async (req, res) => {
  try {
       const result = await studentCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching student:", error);
        res.status(500).send({ message: "Internal server error." });
      }
});

// POST: Add a new story
    app.post('/stories', verifyToken, async (req, res) => {
      try {
        const { quote, name, details, imageURL, status, createdAt } = req.body;

        // Validate required fields
        if (!quote || !name || !details || !imageURL) {
          return res.status(400).json({ message: 'All required fields must be provided' });
        }

        // Create new story
        const newStory = {
          quote,
          name,
          details,
          imageURL,
          status: status || 'pending',
          createdAt: createdAt ? new Date(createdAt) : new Date(),
        };

        // Save to database
        const result = await storyCollection.insertOne(newStory);

        res.status(201).json({
          insertedId: result.insertedId,
          message: 'Story added successfully',
        });
      } catch (error) {
        console.error('Error adding story:', error);
        res.status(500).json({
          message: 'Failed to add story',
          error: error.message,
        });
      }
    });

    // GET: Fetch all stories (public access)
    app.get('/stories', async (req, res) => {
      try {
        const stories = await storyCollection.find().toArray();
        res.send(stories);
      } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).send({ message: 'Failed to fetch stories' });
      }
    });
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Do not close client if keeping server running
  }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
  res.send('LesonPaw is sitting');
});

// Start server
app.listen(port, () => {
  console.log(`LesonPaw is sitting on port ${port}`);
});







