require('dotenv').config()
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 5000;

// middleware
app.use(cors(
    {
        origin: ['http://localhost:5173', 'https://lush-care-f2f32.web.app', 'https://lush-care-f2f32.firebaseapp.com'],
        credentials: true
    }
));
app.use(cookieParser());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rdxg6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyingToken = async (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'not authorized' });
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized' });
        }
        req.user = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const database = client.db("lushCareDB");
        const serviceCollection = database.collection("services");
        const bookingCollection = database.collection("bookings");

        // jwt token
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production' ? true : false,
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })
                .send({ success: true });
        });

        // remove token
        app.post('/logout', async (req, res) => {
            res.clearCookie('token', { maxAge: 0, secure: process.env.NODE_ENV === 'production' ? true : false, sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict', }).send({ success: true });
        });

        // get all services
        app.get('/services', async (req, res) => {

            const limit = parseInt(req.query.limit);

            const searchValue = req.query.search;
            let search = {};

            if (typeof searchValue === 'string' && searchValue.trim() !== '') {
                search = {
                    name: { $regex: searchValue, $options: "i" }
                };
            }
            let cursor = serviceCollection.find(search).sort({ _id: -1 });
            if (limit) {
                cursor.limit(limit);
            }
            const result = await cursor.toArray();
            res.send(result);
        });

        // get individual user added services
        app.get('/my-services', verifyingToken, async (req, res) => {
            const email = req.query.email;
            if (req.user.email !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            let query = { provider_email: email }
            let cursor = serviceCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        // get single service data 
        app.get('/service/:id', async (req, res) => {
            const serviceId = req.params.id;
            const query = { _id: new ObjectId(serviceId) }
            const result = await serviceCollection.findOne(query);
            res.send(result);
        });

        // add services
        app.post('/services', async (req, res) => {
            const newService = req.body;
            const result = await serviceCollection.insertOne(newService);
            res.send(result);
        });

        // update service
        app.patch('/service/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;

            const filter = { _id: new ObjectId(id) }
            const updateService = {
                $set: {
                    name: data.name,
                    image: data.image,
                    area: data.area,
                    price: data.price,
                    description: data.description,
                }
            }
            const result = await serviceCollection.updateOne(filter, updateService);
            res.send(result);
        });

        // delete service
        app.delete('/service/:id', async (req, res) => {
            const serviceId = req.params.id;
            const query = { _id: new ObjectId(serviceId) }
            const result = await serviceCollection.deleteOne(query);
            res.send(result);
        });

        // add booked services
        app.post('/service-bookings', async (req, res) => {
            const newBooking = req.body;
            const result = await bookingCollection.insertOne(newBooking);
            res.send(result);
        });

        // get my booked and scheduled services
        app.get('/booked-services', verifyingToken, async (req, res) => {
            const email = req.query.email;
            const role = req.query.role;

            let query;
            if (role === 'customer') {
                query = { customerEmail: email }
            } else if (role === 'provider') {
                query = { providerEmail: email }
            }

            const cursor = bookingCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        // update booked service status
        app.patch('/booked-services/change-status/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) }
            const updateStatus = {
                $set: {
                    serviceStatus: data.status
                }
            }
            const result = await bookingCollection.updateOne(filter, updateStatus);
            res.send(result);
        })

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('Lush Care Server');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});




