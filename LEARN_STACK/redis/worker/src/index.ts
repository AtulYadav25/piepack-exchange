import { createClient } from "redis";

const client = createClient();

async function main() {
    await client.connect();

    //keep looking for new pushes and pop after processing

    while (1) {
        //Blocking call, not polling
        const submission = await client.blPop("submissions", 0);
        if (submission) console.log(submission);

        console.log("Processing...");
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate processing time

    }
}

main();