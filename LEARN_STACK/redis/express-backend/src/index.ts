import express from 'express';
import { createClient } from 'redis';

const app = express();
const client = createClient();

app.use(express.json());

app.post('/submit', async (req, res) => {

    const { problemId, userId, code } = req.body;

    // Queue
    await client.lPush("submissions", JSON.stringify({ problemId, userId, code }));
    res.json({ message: "Submission received" })

    // On the other side, a worker connects to this redisclient and keeps polling for any work in this queue, gets the right most and processes.

})

async function startServer() {
    try {

        await client.connect();

        app.listen(3000, () => {
            console.log('Server running on port 3000');
        });


    } catch (error) {

    }
}

startServer();