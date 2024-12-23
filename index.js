require('dotenv').config()
const express = require('express');
const app = express();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
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

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const database = client.db("lushCareDB");
        const serviceCollection = database.collection("services");
        const bookingCollection = database.collection("bookings");

        // get services
        app.get('/services', async (req, res) => {
            const limit = parseInt(req.query.limit);
            const email = req.query.email;

            let query = {}
            if (email) {
                query = { provider_email: email }
            }

            let cursor = serviceCollection.find(query).sort({ _id: -1 });
            if (limit) {
                cursor.limit(limit);
            }
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


/*


*/

