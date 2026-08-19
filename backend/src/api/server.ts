import app from './app.js';
import { config } from './config/env.js';
import { initKafkaInfrastructure } from '../kafka-infrastructure/index.js';
import { initWebSocketServer } from '../ws/index.js';

let httpServer: any;

const startServer = async () => {
    try {
        await initKafkaInfrastructure();

        httpServer = await app.listen({
            port: parseInt(config.PORT),
            host: '0.0.0.0'
        });
        console.log(`Server is running on port ${config.PORT}`);

        // Attach WS server now that httpServer is ready
        initWebSocketServer(httpServer);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

startServer();
export { httpServer }