import 'dotenv/config';
import { createApp } from './app.ts';
import { persistence } from './infrastructure/persistence/index.ts';

const PORT = Number(process.env.PORT ?? 3000);

const { connection } = persistence;
const app = createApp(persistence);

connection
    .init()
    .then(() =>
        app.listen(PORT, () => console.log(`Listening on port ${PORT}`)),
    )
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
