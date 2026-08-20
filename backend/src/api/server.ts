import app from './app.js';
import { config } from './config/env.js';
import { initKafkaInfrastructure } from '../kafka-infrastructure/index.js';
import { initWebSocketServer } from '../ws/index.js';

const startServer = async () => {
    try {
        await initKafkaInfrastructure();

        await app.listen({
            port: parseInt(config.PORT),
            host: '0.0.0.0'
        });
        console.log(`Server is running on port ${config.PORT}`);

        initWebSocketServer(app.server);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}

startServer();